/**
 * Mothers' records for clinicians (D2–D5): profile, antenatal visits,
 * delivery, postnatal visits and audited record edits. Every change is
 * written to the record's audit trail and shows in the mother's app.
 */
import { daysBetween, isValidISODate, TODAY, TODAY_ISO } from '../utils/dates'
import { ANC_CONTACTS, dateAtWeek, formatGA, gestationalAge, isHighBp, POSTNATAL_VISITS } from '../utils/pregnancy'
import { accountForMother, notifyFamily, notifyStaff, notifySubject } from '../../notify.js'
import { invalid, notFound, request } from './client'
import { ancPlan, caregiverView, context, enrichAppointment, motherBasics, motherStatus, nowISO, patientBasics, pncPlan, upcomingAppointments } from './helpers'

function findMother(db, id) {
  const m = (db.mothers ?? []).find((x) => x.id === id)
  if (!m) throw notFound('This mother')
  return m
}

function staffName(db, id) {
  return db.staff.find((s) => s.id === id)?.name ?? id
}

function tdRows(m) {
  const pregnant = m.pregnancy?.status === 'pregnant'
  return m.td.map((d) => ({
    ...d,
    name: `Td ${d.dose}`,
    status: d.givenOn ? 'Given' : pregnant && d.latestOn && d.latestOn < TODAY_ISO ? 'Overdue' : 'Planned',
  }))
}

/** GET /api/mothers/:id — the mother's profile (D2). */
export function getMother(id) {
  return request((db) => {
    const m = findMother(db, id)
    const ctx = context(db)
    const p = m.pregnancy
    const status = motherStatus(m)
    const visits = (p?.ancVisits ?? []).map((v) => ({
      ...v,
      clinicianName: staffName(db, v.clinicianId),
      ga: formatGA(gestationalAge(p.lmp, v.date)),
      highBp: isHighBp(v.bpSystolic, v.bpDiastolic),
      lowHb: v.hb !== null && v.hb < 11,
      fhrAbnormal: v.fetalHeartRate !== null && (v.fetalHeartRate < 110 || v.fetalHeartRate > 160),
    }))
    const booking = visits[0]?.weightKg ?? null
    return {
      ...motherBasics(m),
      dob: m.dob,
      phone: m.phone,
      phoneLabel: caregiverView({ name: '', phone: m.phone }).phoneLabel,
      bloodGroup: m.bloodGroup,
      hasApp: m.hasApp,
      registeredOn: m.registeredOn,
      nkda: m.nkda,
      allergies: m.allergies,
      conditions: m.conditions,
      medicines: m.medicines,
      diagnoses: m.diagnoses,
      history: m.history.map((h) => ({ ...h, child: h.childId && ctx.patientsById[h.childId] ? patientBasics(ctx.patientsById[h.childId]) : null })),
      pregnancy: p
        ? {
            ...p,
            ga: status.ga ?? gestationalAge(p.lmp, p.delivery?.date ?? TODAY),
            trimester: status.ga ? (status.ga.weeks < 14 ? 1 : status.ga.weeks < 28 ? 2 : 3) : null,
            daysToGo: p.status === 'pregnant' ? daysBetween(TODAY, p.edd) : 0,
          }
        : null,
      ancVisits: visits,
      progress: visits.map((v) => ({
        id: v.id,
        date: v.date,
        ga: v.ga,
        weeks: Number(v.ga.split('+')[0]),
        weightKg: v.weightKg,
        gain: booking ? Math.round((v.weightKg - booking) * 10) / 10 : 0,
        systolic: v.bpSystolic,
        diastolic: v.bpDiastolic,
      })),
      ancPlan: ancPlan(m),
      delivery: p?.delivery ?? null,
      pncVisits: (p?.pncVisits ?? []).map((v) => ({
        ...v,
        clinicianName: staffName(db, v.clinicianId),
        label: POSTNATAL_VISITS.find((d) => d.key === v.key)?.label,
      })),
      pncPlan: pncPlan(m),
      td: tdRows(m),
      children: (m.childIds ?? [])
        .map((cid) => ctx.patientsById[cid])
        .filter(Boolean)
        .map((c) => patientBasics(c)),
      upcoming: upcomingAppointments(ctx, m.id).map((a) => enrichAppointment(db, ctx, a)),
      audit: [...m.audit].sort((a, b) => (a.at < b.at ? 1 : -1)),
    }
  })
}

/* ------------------------------------------------------------- D3: ANC */

/** GET /api/mothers/:id/anc/form — what the ANC form needs. */
export function getAncForm(id) {
  return request((db) => {
    const m = findMother(db, id)
    const p = m.pregnancy
    if (p?.status !== 'pregnant') throw invalid({ form: `${m.firstName} is not pregnant. Record a postnatal visit instead.` })
    const plan = ancPlan(m)
    const nextContact = plan.find((c) => c.status !== 'Completed') ?? null
    const following = nextContact ? ANC_CONTACTS.find((c) => c.n === nextContact.n + 1) : null
    const plannedTd = tdRows(m).find((d) => d.status !== 'Given') ?? null
    return {
      mother: motherBasics(m),
      lmp: p.lmp,
      edd: p.edd,
      lastVisit: p.ancVisits[p.ancVisits.length - 1] ?? null,
      bookingWeight: p.ancVisits[0]?.weightKg ?? null,
      nextContact,
      suggestedNext: following ? dateAtWeek(p.lmp, following.weeks) : null,
      plannedTd,
    }
  })
}

export const URINE = ['Negative', 'Trace', '+1', '+2', '+3']
export const SUPPLEMENTS = ['Iron and folic acid (IFAS)', 'Calcium', 'Deworming (mebendazole)', 'Anti-D (Rh negative)']

function num(v) {
  return v === '' || v === null || v === undefined ? null : Number(v)
}

/** Validation for D3. Returns { errors, warnings } — warnings are abnormal but allowed values. */
export function validateAnc(f, { lmp } = {}) {
  const errors = {}
  const warnings = []
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the visit date.'
  else if (f.date > TODAY_ISO) errors.date = 'The visit date can’t be in the future.'
  else if (lmp && f.date < lmp) errors.date = 'The visit date is before the last period.'
  const sys = num(f.bpSystolic)
  const dia = num(f.bpDiastolic)
  if (sys === null) errors.bpSystolic = 'Enter the systolic (top) number.'
  else if (!Number.isFinite(sys) || sys < 60 || sys > 250) errors.bpSystolic = 'Systolic should be between 60 and 250.'
  if (dia === null) errors.bpDiastolic = 'Enter the diastolic (bottom) number.'
  else if (!Number.isFinite(dia) || dia < 30 || dia > 150) errors.bpDiastolic = 'Diastolic should be between 30 and 150.'
  else if (sys !== null && dia >= sys) errors.bpDiastolic = 'Diastolic must be lower than systolic.'
  if (!errors.bpSystolic && !errors.bpDiastolic && isHighBp(sys, dia)) warnings.push(`Blood pressure ${sys}/${dia} is 140/90 or higher`)
  const w = num(f.weightKg)
  if (w === null) errors.weightKg = 'Enter the weight.'
  else if (!Number.isFinite(w) || w < 30 || w > 200) errors.weightKg = 'Weight should be between 30 and 200 kg.'
  const fh = num(f.fundalHeightCm)
  if (fh !== null && (!Number.isFinite(fh) || fh < 5 || fh > 50)) errors.fundalHeightCm = 'Fundal height should be between 5 and 50 cm.'
  const fhr = num(f.fetalHeartRate)
  if (fhr !== null) {
    if (!Number.isFinite(fhr) || fhr < 60 || fhr > 220) errors.fetalHeartRate = 'Fetal heart rate should be between 60 and 220.'
    else if (fhr < 110 || fhr > 160) warnings.push(`Fetal heart rate ${fhr} bpm is outside 110–160`)
  }
  const hb = num(f.hb)
  if (hb !== null) {
    if (!Number.isFinite(hb) || hb < 3 || hb > 20) errors.hb = 'Haemoglobin should be between 3 and 20 g/dL.'
    else if (hb < 11) warnings.push(`Haemoglobin ${hb} g/dL is below 11 (anaemia)`)
  }
  if (['+2', '+3'].includes(f.urineProtein)) warnings.push(`Urine protein ${f.urineProtein}`)
  if (['+2', '+3'].includes(f.urineGlucose)) warnings.push(`Urine glucose ${f.urineGlucose}`)
  if (f.tdGiven && !f.tdBatch?.trim()) errors.tdBatch = 'Enter the Td batch number.'
  if (f.nextVisitOn && (!isValidISODate(f.nextVisitOn) || f.nextVisitOn <= (f.date || TODAY_ISO)))
    errors.nextVisitOn = 'The next visit must be after this visit.'
  if ((f.noteForMother ?? '').length > 300) errors.noteForMother = 'Keep the note to 300 characters.'
  return { errors, warnings }
}

/** POST /api/mothers/:id/anc — record an antenatal visit (D3). */
export function recordAncVisit(id, f, userId) {
  return request(
    (db) => {
      const m = findMother(db, id)
      const p = m.pregnancy
      const { errors, warnings } = validateAnc(f, { lmp: p.lmp })
      if (Object.keys(errors).length) throw invalid(errors)
      const plan = ancPlan(m)
      const contact = plan.find((c) => c.status !== 'Completed') ?? null
      const by = staffName(db, userId)
      const visit = {
        id: `anc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        contact: contact?.n ?? null,
        kind: contact ? 'contact' : 'extra',
        date: f.date,
        clinicianId: userId,
        bpSystolic: Number(f.bpSystolic),
        bpDiastolic: Number(f.bpDiastolic),
        weightKg: Number(f.weightKg),
        fundalHeightCm: num(f.fundalHeightCm),
        fetalHeartRate: num(f.fetalHeartRate),
        hb: num(f.hb),
        urineProtein: f.urineProtein,
        urineGlucose: f.urineGlucose,
        supplements: f.supplements,
        tdGiven: null,
        clinicalNote: f.clinicalNote.trim(),
        noteForMother: f.noteForMother.trim(),
        nextVisitOn: f.nextVisitOn || null,
        recordedAt: nowISO(),
      }
      if (f.tdGiven) {
        const td = m.td.find((d) => !d.givenOn)
        if (td) {
          Object.assign(td, { givenOn: f.date, batch: f.tdBatch.trim().toUpperCase(), givenBy: by })
          visit.tdGiven = `Td ${td.dose}`
        }
      }
      p.ancVisits.push(visit)
      m.audit.push({
        id: `au-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        at: nowISO(),
        by,
        action: `Recorded antenatal visit${contact ? ` ${contact.n}` : ''} (${formatGA(gestationalAge(p.lmp, f.date))} weeks)`,
        reason: warnings.length ? `Abnormal: ${warnings.join('; ')}` : 'Routine visit',
      })
      if (warnings.length) {
        db.staffNotifications.unshift({
          id: `sn-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          type: 'abnormal',
          to: db.staff.map((s) => s.id).filter((s) => s !== userId),
          title: `Abnormal reading · ${m.firstName} ${m.lastName}`,
          body: `${warnings.join('; ')}. Recorded by ${by}.`,
          at: nowISO(),
          readBy: [],
          link: `/clinic/mothers/${m.id}`,
        })
      }
      const account = accountForMother(db, m.id)
      if (account) {
        notifyFamily(db, {
          accountId: account.id,
          type: 'antenatal',
          title: `Antenatal visit${contact ? ` ${contact.n}` : ''} recorded`,
          body: [`BP ${visit.bpSystolic}/${visit.bpDiastolic}, weight ${visit.weightKg} kg.`, visit.noteForMother].filter(Boolean).join(' '),
          target: { page: `me/antenatal/${visit.id}` },
        })
        if (visit.tdGiven) {
          notifyFamily(db, { accountId: account.id, type: 'maternal-vaccine', title: `${visit.tdGiven} given`, body: `Recorded at your antenatal visit on ${f.date}.`, target: { page: 'me/vaccines' }, read: true })
        }
      }
      return { id: visit.id, contact: visit.contact, tdGiven: visit.tdGiven, warnings, motherName: m.firstName }
    },
    { mutates: true, delay: 650 },
  )
}

/* -------------------------------------------------- D4: delivery & PNC */

export const DELIVERY_MODES = ['Spontaneous vaginal delivery', 'Assisted vaginal delivery (vacuum)', 'Caesarean section']

export function validateDelivery(f, { lmp } = {}) {
  const errors = {}
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the delivery date.'
  else if (f.date > TODAY_ISO) errors.date = 'The delivery date can’t be in the future.'
  else if (lmp && daysBetween(lmp, f.date) < 154) errors.date = 'That is before 22 weeks. Check the date.'
  if (!f.time) errors.time = 'Enter the time of birth.'
  if (!f.mode) errors.mode = 'Choose the type of delivery.'
  if (!f.outcome) errors.outcome = 'Choose the outcome.'
  if (f.outcome === 'Live birth') {
    if (!f.babyFirstName.trim()) errors.babyFirstName = 'Enter the baby’s first name, or “Baby” for now.'
    if (!f.babySex) errors.babySex = 'Choose girl or boy.'
  }
  const w = Number(f.babyWeightKg)
  if (!f.babyWeightKg) errors.babyWeightKg = 'Enter the baby’s weight.'
  else if (!Number.isFinite(w) || w < 0.4 || w > 6.5) errors.babyWeightKg = 'Baby’s weight should be between 0.4 and 6.5 kg.'
  return errors
}

/** POST /api/mothers/:id/delivery — creates the baby's record, links it and generates the KEPI schedule. */
export function recordDelivery(id, f, userId) {
  return request(
    (db) => {
      const m = findMother(db, id)
      const p = m.pregnancy
      if (p?.status !== 'pregnant') throw invalid({ form: 'There is no ongoing pregnancy to record a delivery for.' })
      const errors = validateDelivery(f, { lmp: p.lmp })
      if (Object.keys(errors).length) throw invalid(errors)
      const gestation = formatGA(gestationalAge(p.lmp, f.date))
      const by = staffName(db, userId)
      let childId = null
      let childPatientId = null
      if (f.outcome === 'Live birth') {
        db.patientSerial += 1
        childId = `p-new-${db.patientSerial}`
        childPatientId = `TFH-P-${f.date.slice(2).replace(/-/g, '')}-${String(db.patientSerial).padStart(3, '0')}`
        db.patients.push({
          id: childId,
          facilityId: db.facility.id,
          firstName: f.babyFirstName.trim(),
          lastName: m.lastName,
          sex: f.babySex,
          dob: f.date,
          patientId: childPatientId,
          tone: 'mint',
          birthWeightKg: Number(f.babyWeightKg),
          birthNotificationNo: '',
          registeredOn: TODAY_ISO,
          recordStatus: 'linked',
          bornAt: db.facility.name,
          birthLengthCm: f.babyLengthCm ? Number(f.babyLengthCm) : null,
          mainClinicianId: null,
          caregivers: [
            {
              id: accountForMother(db, m.id)?.id ?? `cg-${m.id}`,
              name: `${m.firstName} ${m.lastName}`,
              relationship: 'Mother',
              phone: m.phone,
              email: '',
              primary: true,
              hasApp: m.hasApp,
              motherId: m.id,
              tone: m.tone,
            },
          ],
          allergies: [],
          medicines: [],
          conditions: [],
          diagnoses: [],
          audit: [],
          pastVisits: [],
          contactLog: [],
        })
        if (f.birthDoses) {
          ;['bcg', 'opv-0'].forEach((key, i) =>
            db.doses.push({
              id: `dose-${childId}-${key}`,
              patientId: childId,
              key,
              givenOn: f.date,
              batch: 'Recorded at birth',
              site: key === 'bcg' ? 'Left forearm' : 'Mouth',
              route: key === 'bcg' ? 'ID' : 'Oral',
              givenBy: by,
              facility: db.facility.name,
              notes: '',
              seq: i + 1,
            }),
          )
        }
        db.measurements.push({
          id: `m-${childId}-birth`,
          patientId: childId,
          date: f.date,
          weightKg: Number(f.babyWeightKg),
          heightCm: f.babyLengthCm ? Number(f.babyLengthCm) : null,
          muacCm: null,
          tempC: null,
          by,
        })
        m.childIds = [...(m.childIds ?? []), childId]
      }
      p.status = 'delivered'
      p.para = (p.para ?? 0) + 1
      p.delivery = {
        date: f.date,
        time: f.time,
        mode: f.mode,
        gestation,
        outcome: f.outcome,
        babySex: f.babySex,
        babyWeightKg: Number(f.babyWeightKg),
        babyLengthCm: f.babyLengthCm ? Number(f.babyLengthCm) : null,
        apgar: f.apgar,
        bloodLoss: f.bloodLoss,
        attendedBy: by,
        childId,
        notes: f.notes,
      }
      m.history.unshift({
        id: `h-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        year: Number(f.date.slice(0, 4)),
        outcome: f.outcome === 'Live birth' ? `Live birth (${f.babySex === 'female' ? 'girl' : 'boy'})` : f.outcome,
        delivery: f.mode,
        babyWeightKg: Number(f.babyWeightKg),
        gestation,
        childId,
      })
      m.audit.push({
        id: `au-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        at: nowISO(),
        by,
        action: `Recorded delivery: ${f.mode}, ${f.babyWeightKg} kg at ${gestation} weeks`,
        reason: childId ? `Baby record ${childPatientId} created and KEPI schedule generated` : f.outcome,
      })
      const account = accountForMother(db, m.id)
      if (account) {
        notifyFamily(db, {
          accountId: account.id,
          type: 'record',
          title: childId ? `${f.babyFirstName.trim()}’s record is ready` : 'Your delivery was recorded',
          body: childId
            ? `Born ${f.date} · ${f.babyWeightKg} kg. Her vaccines and growth are now in the app.`.replace('Her', f.babySex === 'male' ? 'His' : 'Her')
            : `${f.mode} on ${f.date}. Your postnatal checks are in My health.`,
          target: { page: 'me/postnatal' },
        })
        if (account.tracking === 'pregnancy') account.tracking = 'both'
      }
      return { childId, childPatientId, babyName: childId ? `${f.babyFirstName.trim()} ${m.lastName}` : null }
    },
    { mutates: true, delay: 700 },
  )
}

export const UTERUS = ['Well contracted', 'Involuting normally', 'Normal size', 'Tender or enlarged']
export const BLEEDING = ['Normal lochia', 'Light', 'Stopped', 'Heavy', 'Bad-smelling']
export const WOUND = ['Intact', 'Healing well', 'Healed', 'Signs of infection']
export const FP_METHODS = [
  'Not discussed yet',
  'Counselled, undecided',
  'Progestin-only pill',
  'Injectable (DMPA)',
  'Implant',
  'IUCD',
  'Condoms',
  'Lactational amenorrhoea',
]

/** GET /api/mothers/:id/postnatal/form */
export function getPostnatalForm(id) {
  return request((db) => {
    const m = findMother(db, id)
    const p = m.pregnancy
    const plan = pncPlan(m)
    return {
      mother: motherBasics(m),
      pregnant: p?.status === 'pregnant',
      lmp: p?.lmp ?? null,
      edd: p?.edd ?? null,
      delivery: p?.delivery ?? null,
      daysSinceBirth: p?.delivery ? daysBetween(p.delivery.date, TODAY) : null,
      nextVisit: plan.find((v) => v.status !== 'Completed') ?? null,
      plan,
      child: p?.delivery?.childId ? patientBasics(db.patients.find((x) => x.id === p.delivery.childId)) : null,
    }
  })
}

export function validatePostnatal(f) {
  const errors = {}
  const warnings = []
  if (!f.key) errors.key = 'Choose which postnatal visit this is.'
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the visit date.'
  else if (f.date > TODAY_ISO) errors.date = 'The visit date can’t be in the future.'
  const sys = Number(f.bpSystolic)
  const dia = Number(f.bpDiastolic)
  if (!f.bpSystolic || !Number.isFinite(sys) || sys < 60 || sys > 250) errors.bpSystolic = 'Enter a systolic number between 60 and 250.'
  if (!f.bpDiastolic || !Number.isFinite(dia) || dia < 30 || dia > 150) errors.bpDiastolic = 'Enter a diastolic number between 30 and 150.'
  if (!errors.bpSystolic && !errors.bpDiastolic && isHighBp(sys, dia)) warnings.push(`Blood pressure ${sys}/${dia} is 140/90 or higher`)
  if (f.tempC && (Number(f.tempC) < 34 || Number(f.tempC) > 42.5)) errors.tempC = 'Temperature should be between 34 and 42.5 °C.'
  else if (Number(f.tempC) >= 38) warnings.push(`Temperature ${f.tempC} °C (fever)`)
  if (f.bleeding === 'Heavy' || f.bleeding === 'Bad-smelling') warnings.push(`Bleeding: ${f.bleeding.toLowerCase()}`)
  if (f.epds && Number(f.epds) >= 13) warnings.push(`Depression screen (EPDS) ${f.epds}`)
  if (f.babyWeightKg && (Number(f.babyWeightKg) < 0.4 || Number(f.babyWeightKg) > 10)) errors.babyWeightKg = 'Baby’s weight should be between 0.4 and 10 kg.'
  return { errors, warnings }
}

/** POST /api/mothers/:id/postnatal — record a postnatal visit (D4). */
export function recordPostnatalVisit(id, f, userId) {
  return request(
    (db) => {
      const m = findMother(db, id)
      const p = m.pregnancy
      if (!p?.delivery) throw invalid({ form: 'Record the delivery first.' })
      const { errors, warnings } = validatePostnatal(f)
      if (Object.keys(errors).length) throw invalid(errors)
      const by = staffName(db, userId)
      const visit = {
        id: `pnc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        key: f.key,
        date: f.date,
        clinicianId: userId,
        bp: [Number(f.bpSystolic), Number(f.bpDiastolic)],
        tempC: f.tempC ? Number(f.tempC) : null,
        weightKg: f.weightKg ? Number(f.weightKg) : null,
        uterus: f.uterus,
        bleeding: f.bleeding,
        perineum: f.perineum,
        breasts: f.breasts,
        epds: f.epds ? Number(f.epds) : null,
        hb: f.hb ? Number(f.hb) : null,
        baby: [
          f.babyWeightKg && `Weight ${f.babyWeightKg} kg`,
          f.babyFeeding,
          f.babyCord && `cord ${f.babyCord.toLowerCase()}`,
          f.babyJaundice && `jaundice: ${f.babyJaundice.toLowerCase()}`,
        ]
          .filter(Boolean)
          .join(', '),
        familyPlanning: [f.fpMethod !== 'Not discussed yet' ? f.fpMethod : '', f.fpNote].filter(Boolean).join(' — '),
        note: f.noteForMother.trim(),
        nextVisitOn: f.nextVisitOn || null,
        mood: f.epds ? `Depression screen (EPDS) ${f.epds}` : null,
        babyDetails:
          f.babyWeightKg || f.babyFeeding || f.babyCord || f.babyJaundice
            ? { weightKg: f.babyWeightKg ? Number(f.babyWeightKg) : null, feeding: f.babyFeeding || null, cord: f.babyCord || null, jaundice: f.babyJaundice || null, tempC: null }
            : null,
      }
      p.pncVisits = [...p.pncVisits.filter((v) => v.key !== f.key), visit]
      if (f.babyWeightKg && p.delivery.childId) {
        db.measurements.push({
          id: `m-${p.delivery.childId}-${f.date}`,
          patientId: p.delivery.childId,
          date: f.date,
          weightKg: Number(f.babyWeightKg),
          heightCm: null,
          muacCm: null,
          tempC: null,
          by,
        })
      }
      const label = POSTNATAL_VISITS.find((d) => d.key === f.key)?.label
      m.audit.push({
        id: `au-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        at: nowISO(),
        by,
        action: `Recorded postnatal visit (${label})`,
        reason: warnings.length ? `Abnormal: ${warnings.join('; ')}` : 'Routine visit',
      })
      if (warnings.length) {
        notifyStaff(db, {
          to: db.staff.map((s) => s.id).filter((s) => s !== userId),
          type: 'abnormal',
          title: `Abnormal reading · ${m.firstName} ${m.lastName}`,
          body: `${warnings.join('; ')}. Recorded by ${by}.`,
          link: `/clinic/mothers/${m.id}`,
        })
      }
      const account = accountForMother(db, m.id)
      if (account) {
        notifyFamily(db, {
          accountId: account.id,
          type: 'postnatal',
          title: `Postnatal check (${label}) recorded`,
          body: visit.note || `Recorded by ${by}.`,
          target: { page: 'me/postnatal' },
        })
      }
      return { id: visit.id, label, warnings }
    },
    { mutates: true, delay: 600 },
  )
}

/* -------------------------------------------- D5: audited record edits */

export const RECORD_LISTS = {
  allergies: { label: 'Allergies', field: 'substance', detail: 'reaction' },
  conditions: { label: 'Conditions', field: 'name', detail: 'detail' },
  medicines: { label: 'Medicines', field: 'name', detail: 'directions' },
  diagnoses: { label: 'Diagnoses', field: 'name', detail: 'code' },
}

export function validateRecordEdit({ list, fields, reason, action }) {
  const errors = {}
  const spec = RECORD_LISTS[list]
  if (!spec) errors.form = 'Choose what to change.'
  if (action !== 'remove' && !fields?.[spec?.field]?.trim()) errors.name = `Enter the ${list === 'allergies' ? 'substance' : 'name'}.`
  if (!reason?.trim()) errors.reason = 'Give a reason — it is saved in the audit trail.'
  else if (reason.trim().length < 4) errors.reason = 'Add a little more detail to the reason.'
  return errors
}

/**
 * PATCH /api/records/:kind/:id — add, edit or remove an allergy, condition,
 * medicine or diagnosis on a mother's or infant's record, with a reason.
 */
export function editRecord(kind, id, { list, action, itemId, fields, reason }, userId) {
  return request(
    (db) => {
      const target = kind === 'mother' ? findMother(db, id) : db.patients.find((p) => p.id === id)
      if (!target) throw notFound('This record')
      const errors = validateRecordEdit({ list, fields, reason, action })
      if (Object.keys(errors).length) throw invalid(errors)
      const spec = RECORD_LISTS[list]
      target[list] ??= []
      target.audit ??= []
      const by = staffName(db, userId)
      const at = nowISO()
      let summary
      if (action === 'add') {
        const entry = {
          id: `${list}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          [spec.field]: fields[spec.field].trim(),
          [spec.detail]: fields[spec.detail]?.trim() ?? '',
          by,
          at,
          source: 'clinician',
          recordedOn: TODAY_ISO,
        }
        if (list === 'conditions') entry.status = fields.status || 'Active'
        if (list === 'medicines' && kind === 'infant') entry.dose = entry.directions
        target[list].push(entry)
        if (list === 'allergies' && kind === 'mother') target.nkda = null
        summary = `Added ${list.slice(0, -1).replace('ie', 'y')}: ${entry[spec.field]}`
      } else {
        const entry = target[list].find((x) => x.id === itemId)
        if (!entry) throw notFound('This entry')
        if (action === 'remove') {
          target[list] = target[list].filter((x) => x.id !== itemId)
          summary = `Removed ${list.slice(0, -1).replace('ie', 'y')}: ${entry[spec.field] ?? entry.name}`
        } else {
          Object.assign(entry, { [spec.field]: fields[spec.field].trim(), [spec.detail]: fields[spec.detail]?.trim() ?? '', by, at, source: 'clinician' })
          if (list === 'conditions' && fields.status) entry.status = fields.status
          if (list === 'medicines' && kind === 'infant') entry.dose = entry.directions
          summary = `Edited ${list.slice(0, -1).replace('ie', 'y')}: ${entry[spec.field]}`
        }
      }
      target.audit.push({ id: `au-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at, by, action: summary, reason: reason.trim() })
      notifySubject(db, id, {
        type: 'record',
        title: kind === 'mother' ? `${by} updated your health record` : `${by} updated ${target.firstName}’s health record`,
        body: `${summary}.`,
        target: { page: kind === 'mother' ? 'me' : 'health' },
      })
      return { summary, at, by }
    },
    { mutates: true, delay: 450 },
  )
}

/** GET /api/records/:kind/:id — lists and audit trail for the edit panel. */
export function getRecordForEdit(kind, id) {
  return request((db) => {
    const target = kind === 'mother' ? findMother(db, id) : db.patients.find((p) => p.id === id)
    if (!target) throw notFound('This record')
    return {
      name: `${target.firstName} ${target.lastName}`,
      allergies: (target.allergies ?? []).map((a) => ({ ...a, reaction: a.reaction ?? '' })),
      conditions: target.conditions ?? [],
      medicines: (target.medicines ?? []).map((x) => ({ ...x, directions: x.directions ?? x.dose ?? '' })),
      diagnoses: target.diagnoses ?? [],
      audit: [...(target.audit ?? [])].sort((a, b) => (a.at < b.at ? 1 : -1)),
      viewer: kind === 'mother' ? 'mother' : 'parent',
    }
  })
}

/** GET /api/mothers/options — mothers for the booking form's patient picker. */
export function listMotherOptions() {
  return request((db) =>
    (db.mothers ?? []).map((m) => {
      const b = motherBasics(m)
      return {
        id: m.id,
        label: `${b.fullName} · ${b.status.label} · ${m.patientId}`,
        fullName: b.fullName,
        caregiverName: b.fullName,
        caregiverHasApp: m.hasApp,
      }
    }),
  )
}
