const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createMollieClient } = require('@mollie/api-client');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

async function zetDatabaseKlaar() {
  try {
    const schema = fs.readFileSync(__dirname + '/schema.sql', 'utf8');
    await pool.query(schema);
    console.log('Database-tabellen staan klaar (aangemaakt indien nodig)');
  } catch (e) {
    console.error('Kon schema niet uitvoeren:', e.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Auth ----------
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Niet ingelogd' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Ongeldige of verlopen sessie' });
  }
}

app.post('/auth/registreer', async (req, res) => {
  const { email, wachtwoord, naam, leeftijd } = req.body;
  if (leeftijd < 18) return res.status(400).json({ error: 'Je moet 18 jaar of ouder zijn' });
  const hash = await bcrypt.hash(wachtwoord, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, wachtwoord_hash, naam, leeftijd) VALUES ($1,$2,$3,$4) RETURNING id`,
      [email, hash, naam, leeftijd]
    );
    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch (e) {
    res.status(400).json({ error: 'E-mail al in gebruik of ongeldige gegevens' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, wachtwoord } = req.body;
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  if (!rows[0] || !(await bcrypt.compare(wachtwoord, rows[0].wachtwoord_hash))) {
    return res.status(401).json({ error: 'Onjuiste inloggegevens' });
  }
  const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

// ---------- Matches ----------
app.get('/matches/vandaag', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, u.id AS match_user_id, u.naam, u.leeftijd, p.bio, p.prompt_vraag, p.prompt_antwoord, p.interesse_tags
     FROM matches m
     JOIN users u ON u.id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
     JOIN profielen p ON p.user_id = u.id
     WHERE (m.user_a_id = $1 OR m.user_b_id = $1) AND m.status = 'voorgesteld'
     ORDER BY m.aangemaakt_op DESC LIMIT 1`,
    [req.user.id]
  );
  res.json(rows[0] || null);
});

app.post('/matches/:id/accept', requireAuth, async (req, res) => {
  await pool.query(`UPDATE matches SET status = 'geaccepteerd' WHERE id = $1`, [req.params.id]);
  const { rows } = await pool.query(`INSERT INTO dates (match_id, status) VALUES ($1, 'tijden_kiezen') RETURNING id`, [req.params.id]);
  res.json({ dateId: rows[0].id });
});

app.post('/matches/:id/decline', requireAuth, async (req, res) => {
  await pool.query(`UPDATE matches SET status = 'afgewezen' WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// ---------- Dates & betaling ----------
async function maakBetaling({ bedrag, beschrijving, dateId, userId }) {
  return mollieClient.payments.create({
    amount: { currency: 'EUR', value: bedrag.toFixed(2) },
    description: beschrijving,
    redirectUrl: `${process.env.APP_URL}/dates/${dateId}`,
    webhookUrl: `${process.env.APP_URL}/webhooks/mollie`,
    metadata: { dateId, userId },
  });
}

async function terugbetalen(paymentId, bedrag) {
  return mollieClient.payments_refunds.create({ paymentId, amount: { currency: 'EUR', value: bedrag.toFixed(2) } });
}

app.post('/dates/:id/tijden', requireAuth, async (req, res) => {
  const { tijden } = req.body;
  const { rows } = await pool.query(`SELECT match_id FROM dates WHERE id = $1`, [req.params.id]);
  const { rows: matchRows } = await pool.query(`SELECT user_a_id, user_b_id FROM matches WHERE id = $1`, [rows[0].match_id]);
  const kolom = matchRows[0].user_a_id === req.user.id ? 'voorgestelde_tijden_a' : 'voorgestelde_tijden_b';
  await pool.query(`UPDATE dates SET ${kolom} = $1 WHERE id = $2`, [tijden, req.params.id]);
  res.json({ ok: true });
});

app.post('/dates/:id/bevestig', requireAuth, async (req, res) => {
  const { tijd, locatie } = req.body;
  await pool.query(`UPDATE dates SET bevestigde_tijd = $1, locatie = $2, status = 'bevestigd' WHERE id = $3`, [tijd, locatie, req.params.id]);
  const { rows } = await pool.query(`SELECT match_id FROM dates WHERE id = $1`, [req.params.id]);
  const { rows: matchRows } = await pool.query(`SELECT user_a_id, user_b_id FROM matches WHERE id = $1`, [rows[0].match_id]);
  const userIds = [matchRows[0].user_a_id, matchRows[0].user_b_id];
  const betalingen = [];
  for (const userId of userIds) {
    const payment = await maakBetaling({ bedrag: 10, beschrijving: 'Monsega - date-toezegging', dateId: req.params.id, userId });
    const { rows: bRows } = await pool.query(
      `INSERT INTO betalingen (date_id, user_id, mollie_payment_id, bedrag, status) VALUES ($1,$2,$3,10.00,'open') RETURNING id`,
      [req.params.id, userId, payment.id]
    );
    betalingen.push({ userId, checkoutUrl: payment.getCheckoutUrl(), betalingId: bRows[0].id });
  }
  res.json({ betalingen });
});

// ---------- Check-in (de kern van de no-show-regeling) ----------
function bepaalCheckinUitkomst(c1, c2) {
  if (!c1 || !c2) return { status: 'wacht_op_andere_partij', terugbetalenAan: [] };
  const beideZeggenWel = c1.kwam_opdagen && c2.kwam_opdagen;
  const beideZeggenNiet = !c1.kwam_opdagen && !c2.kwam_opdagen;
  if (beideZeggenWel) return { status: 'voltooid', terugbetalenAan: [] };
  if (beideZeggenNiet) return { status: 'conflict_naar_review', terugbetalenAan: [c1.user_id, c2.user_id], maakReview: true };
  const wieKwamId = c1.kwam_opdagen === false ? c1.user_id : c2.user_id;
  return { status: 'no_show_verwerkt', terugbetalenAan: [wieKwamId] };
}

app.post('/dates/:id/checkin', requireAuth, async (req, res) => {
  const { kwam_opdagen } = req.body;
  await pool.query(
    `INSERT INTO checkins (date_id, user_id, kwam_opdagen) VALUES ($1,$2,$3)
     ON CONFLICT (date_id, user_id) DO UPDATE SET kwam_opdagen = $3`,
    [req.params.id, req.user.id, kwam_opdagen]
  );
  const { rows: checkins } = await pool.query(`SELECT user_id, kwam_opdagen FROM checkins WHERE date_id = $1`, [req.params.id]);
  const uitkomst = bepaalCheckinUitkomst(checkins[0], checkins[1]);
  if (uitkomst.status === 'wacht_op_andere_partij') return res.json(uitkomst);

  for (const userId of uitkomst.terugbetalenAan) {
    const { rows: betaling } = await pool.query(`SELECT * FROM betalingen WHERE date_id = $1 AND user_id = $2`, [req.params.id, userId]);
    if (betaling[0] && betaling[0].status === 'betaald') {
      await terugbetalen(betaling[0].mollie_payment_id, 10);
      await pool.query(`UPDATE betalingen SET status = 'terugbetaald' WHERE id = $1`, [betaling[0].id]);
    }
  }
  if (uitkomst.maakReview) {
    await pool.query(`INSERT INTO reviews (date_id, reden, status) VALUES ($1, 'tegenstrijdige_meldingen', 'open')`, [req.params.id]);
  }
  await pool.query(`UPDATE dates SET status = $1 WHERE id = $2`, [uitkomst.status === 'voltooid' ? 'voltooid' : 'no_show', req.params.id]);
  res.json(uitkomst);
});

// ---------- Mollie webhook ----------
app.post('/webhooks/mollie', express.urlencoded({ extended: true }), async (req, res) => {
  const paymentId = req.body.id;
  const payment = await mollieClient.payments.get(paymentId);
  if (payment.status === 'paid') {
    await pool.query(`UPDATE betalingen SET status = 'betaald' WHERE mollie_payment_id = $1`, [paymentId]);
    const { rows } = await pool.query(`SELECT date_id FROM betalingen WHERE mollie_payment_id = $1`, [paymentId]);
    const dateId = rows[0]?.date_id;
    if (dateId) {
      const { rows: openRows } = await pool.query(`SELECT COUNT(*) FROM betalingen WHERE date_id = $1 AND status != 'betaald'`, [dateId]);
      if (Number(openRows[0].count) === 0) await pool.query(`UPDATE dates SET status = 'bevestigd' WHERE id = $1`, [dateId]);
    }
  }
  res.sendStatus(200);
});

// ---------- Admin ----------
app.get('/admin/stats', requireAuth, async (req, res) => {
  const { rows: [gebruikers] } = await pool.query(`SELECT COUNT(*) FROM users`);
  const { rows: [datesWeek] } = await pool.query(`SELECT COUNT(*) FROM dates WHERE bevestigde_tijd > now() - interval '7 days'`);
  const { rows: [omzet] } = await pool.query(`SELECT COALESCE(SUM(bedrag),0) AS totaal FROM betalingen WHERE status = 'betaald' AND aangemaakt_op > now() - interval '7 days'`);
  const { rows: [reviews] } = await pool.query(`SELECT COUNT(*) FROM reviews WHERE status = 'open'`);
  res.json({ actieveGebruikers: Number(gebruikers.count), datesDezeWeek: Number(datesWeek.count), omzetDezeWeek: Number(omzet.totaal), openReviews: Number(reviews.count) });
});

app.get('/admin/users', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT id, naam, leeftijd, aangemaakt_op FROM users ORDER BY aangemaakt_op DESC`);
  res.json(rows);
});

app.get('/admin/matches', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.id, ua.naam AS naam_a, ub.naam AS naam_b, d.bevestigde_tijd, d.locatie, d.status
    FROM dates d JOIN matches m ON m.id = d.match_id JOIN users ua ON ua.id = m.user_a_id JOIN users ub ON ub.id = m.user_b_id
    ORDER BY d.bevestigde_tijd DESC NULLS LAST`);
  res.json(rows);
});

app.get('/admin/reviews', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM reviews WHERE status = 'open' ORDER BY aangemaakt_op DESC`);
  res.json(rows);
});

app.post('/admin/reviews/:id/resolve', requireAuth, async (req, res) => {
  await pool.query(`UPDATE reviews SET status = 'afgehandeld', actie = $1 WHERE id = $2`, [req.body.actie, req.params.id]);
  res.json({ ok: true });
});

app.get('/', (req, res) => res.json({ status: 'Monsega-backend draait' }));

const PORT = process.env.PORT || 3000;
zetDatabaseKlaar().then(() => {
  app.listen(PORT, () => console.log(`Monsega-backend luistert op poort ${PORT}`));
});
