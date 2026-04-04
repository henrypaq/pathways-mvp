'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { updateRoadmapStep, type StepStatus } from './actions'
import type { RecommendedRoadmapStep } from '@/lib/types'

// ── Step guide library ────────────────────────────────────────────────────────
// Matched against step title/id by keyword. Each entry provides a concrete
// step-by-step sub-flow with links for the user to follow in real life.

interface SubStep {
  title: string
  detail: string
  url?: string
  urlLabel?: string
  tip?: string
}

interface StepGuide {
  overview: string
  steps: SubStep[]
  note?: string
}

const GUIDES: Array<{ match: string[]; guide: StepGuide }> = [
  {
    match: ['noc', 'occupation code', 'national occupation', 'job code', 'occupational classification'],
    guide: {
      overview: 'Your NOC (National Occupational Classification) code is the foundation of your Express Entry profile. You need to confirm your occupation falls under the right category and that your experience matches the official description.',
      steps: [
        {
          title: 'Search for your job title in the NOC tool',
          detail: 'Go to the ESDC NOC browser and search your exact job title. Review the results and find the code whose "lead statement" and "main duties" best match what you actually do at work.',
          url: 'https://noc.esdc.gc.ca/',
          urlLabel: 'Open NOC browser',
        },
        {
          title: 'Confirm you meet the experience requirements',
          detail: 'Read the full description for your chosen NOC code. Your actual work experience must match at least 2-3 of the listed main duties. Keep a written record of how your work matches each duty — you may be asked to provide this later.',
          tip: 'NOC codes in TEER categories 0, 1, 2, or 3 are eligible for Express Entry Federal Skilled Worker.',
        },
        {
          title: 'Check the IRCC NOC eligibility guide',
          detail: 'Use the IRCC tool to confirm your NOC is accepted for the Federal Skilled Worker Program. Not all NOC codes qualify.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/find-national-occupation-code.html',
          urlLabel: 'IRCC NOC eligibility guide',
        },
        {
          title: 'Record your NOC code',
          detail: 'Note your full NOC code (5 digits, e.g. 72410 for Plumbers). You will enter this when creating your Express Entry profile. If you have held multiple jobs, identify the NOC for each one you plan to claim experience for.',
        },
      ],
      note: 'For the demo profile (Plumber): NOC 72410 — Plumbers. TEER 2, eligible for FSW.',
    },
  },
  {
    match: ['language test', 'ielts', 'celpip', 'tef', 'tcf', 'english test', 'french test', 'language proficiency', 'language score', 'clb'],
    guide: {
      overview: 'An official language test score is mandatory for Express Entry. Your score is converted to a CLB (Canadian Language Benchmark) level and directly affects your CRS score — it is the single highest-impact factor you can improve.',
      steps: [
        {
          title: 'Choose your test',
          detail: 'For English: IELTS General Training or CELPIP General. For French: TEF Canada or TCF Canada. IELTS is the most widely accepted. CELPIP is computer-based and quicker to schedule in Canada.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements/language-testing.html',
          urlLabel: 'IRCC language test options',
        },
        {
          title: 'Register for your test',
          detail: 'Book through the official testing body. IELTS: book at ielts.org or through the British Council/IDP. CELPIP: book at celpip.ca. TEF/TCF: book through the Alliance Française.',
          url: 'https://ielts.org/book-a-test',
          urlLabel: 'Book IELTS',
          tip: 'Book 6-8 weeks ahead — test slots fill quickly in major cities.',
        },
        {
          title: 'Understand the minimum scores',
          detail: 'For Federal Skilled Worker, you need CLB 7 in all four skills (reading, writing, listening, speaking). For IELTS General Training this means a minimum of 6.0 in each band. Higher scores = higher CRS points.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements.html',
          urlLabel: 'CLB minimum requirements',
        },
        {
          title: 'Request your results be sent to IRCC',
          detail: 'When entering your scores in your Express Entry profile, you will provide your test reference number. IRCC will validate your results directly with the testing organization.',
        },
      ],
    },
  },
  {
    match: ['eca', 'educational credential', 'credential assessment', 'education assessment', 'wes', 'degree recognition'],
    guide: {
      overview: 'If you were educated outside Canada, you need an Educational Credential Assessment (ECA) from a IRCC-designated organization to confirm your degree is equivalent to a Canadian credential.',
      steps: [
        {
          title: 'Choose an ECA organization',
          detail: 'IRCC accepts several designated organizations. WES (World Education Services) is the most commonly used and widely accepted. Others include ICAS, CES, IQAS, and PEBC (for pharmacy).',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/education-assessed/who-can-assess.html',
          urlLabel: 'Designated ECA organizations',
        },
        {
          title: 'Create your WES account and apply',
          detail: 'Go to wes.org/ca and create an account. Start a new application for "ECA for IRCC". Select the credential you are having assessed (degree, diploma, etc.).',
          url: 'https://www.wes.org/ca/',
          urlLabel: 'Apply at WES',
        },
        {
          title: 'Request transcripts from your institution',
          detail: 'Your university or college must send official transcripts directly to WES — you cannot submit them yourself. Contact your institution\'s registrar office with the WES mailing address. Allow 4-8 weeks for institutions to respond.',
          tip: 'Start this step early — institution delays are the most common cause of ECA processing time overruns.',
        },
        {
          title: 'Submit supporting documents',
          detail: 'Upload copies of your degree certificates and any other required documents through your WES account. Verify WES has received your transcripts by checking the online tracker.',
        },
        {
          title: 'Receive your ECA report',
          detail: 'WES standard processing is 7-14 business weeks. You will receive a reference number to enter in your Express Entry profile once the ECA is complete.',
          url: 'https://www.wes.org/ca/wes-gateway/',
          urlLabel: 'Check WES processing times',
        },
      ],
      note: 'The ECA report is valid for 5 years for Express Entry purposes.',
    },
  },
  {
    match: ['express entry profile', 'create profile', 'online profile', 'crs score', 'crs profile', 'enter the pool', 'expression of interest'],
    guide: {
      overview: 'Your Express Entry profile is your formal application to enter the pool of candidates. Once submitted, IRCC calculates your CRS score. You wait in the pool until you receive an Invitation to Apply (ITA) during a draw.',
      steps: [
        {
          title: 'Gather all required information',
          detail: 'Before starting, have ready: passport details, language test reference number and scores, education history (institution names, dates, countries), full work history (employer, dates, hours per week, NOC code for each job), ECA reference number if applicable.',
        },
        {
          title: 'Log in to your IRCC account and start the Express Entry profile',
          detail: 'Go to the IRCC portal, log in with your GCKey, and click "Apply to come to Canada". Answer the initial eligibility questions. This determines which programs you qualify for (FSW, CEC, FSTP).',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/works.html',
          urlLabel: 'Start Express Entry profile',
        },
        {
          title: 'Complete all profile sections',
          detail: 'Fill in personal information, contact details, passport, education history, language results, and work history. For work experience, provide exact start and end dates, weekly hours, and the NOC code for each job. List all jobs held in the past 10 years.',
        },
        {
          title: 'Review your CRS score',
          detail: 'Before submitting, your CRS score is shown. The key factors are: age (younger = more points), education (higher = more points), language (higher bands = more points), Canadian experience, and adaptability. Use the CRS calculator to see how improving any factor would change your score.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/come-canada-tool-immigration-express-entry.html',
          urlLabel: 'IRCC Come to Canada tool',
          tip: 'Improving your IELTS score by one band level can add 30-80 CRS points.',
        },
        {
          title: 'Submit your profile',
          detail: 'Review everything carefully — errors can cause delays or affect eligibility. Once satisfied, submit the profile. You are now in the Express Entry pool. IRCC holds rounds of invitations (draws) approximately every two weeks.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html',
          urlLabel: 'Submit profile guide',
        },
      ],
      note: 'Monitor IRCC draw results at canada.ca/express-entry-rounds. You can update your profile at any time if your situation changes.',
    },
  },
  {
    match: ['settlement funds', 'proof of funds', 'financial requirements', 'bank statement', 'savings', 'financial proof'],
    guide: {
      overview: 'To qualify for Federal Skilled Worker, you must show you have enough money to support yourself (and any dependants) when you arrive in Canada. These funds must be available and unencumbered (not a loan or line of credit).',
      steps: [
        {
          title: 'Check the current minimum funds requirement',
          detail: 'IRCC publishes updated minimum settlement funds every year. For 2025, a single applicant needs approximately CAD $13,757. The amount increases for each additional family member.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html',
          urlLabel: 'Current minimum funds table',
        },
        {
          title: 'Obtain bank statements',
          detail: 'Get official bank statements covering the past 6 months from all accounts you are claiming. Statements must show: your name, the institution name, account number, all transactions and balances, and be stamped or on official letterhead.',
          tip: 'Funds must be in your name (or jointly held). You cannot use a family member\'s account unless they are coming with you.',
        },
        {
          title: 'Get a bank letter if required',
          detail: 'Some banks issue a letter confirming your average balance. While not always required, it strengthens your application. Ask your bank\'s international services department.',
        },
        {
          title: 'Convert funds to CAD equivalents',
          detail: 'If your funds are in another currency, use the Bank of Canada exchange rate on the date you prepare your documents. Keep a record of the conversion calculation.',
          url: 'https://www.bankofcanada.ca/rates/exchange/',
          urlLabel: 'Bank of Canada exchange rates',
        },
      ],
      note: 'You do not need to transfer the money to Canada before applying — you just need to demonstrate the funds exist.',
    },
  },
  {
    match: ['police certificate', 'background check', 'criminal record', 'clearance certificate', 'security clearance', 'police record'],
    guide: {
      overview: 'You need police certificates from every country where you have lived for 6 or more months since turning 18. Each country has its own process for obtaining these.',
      steps: [
        {
          title: 'List all countries where you have lived for 6+ months since age 18',
          detail: 'Go through your residential history carefully. You will need a certificate from each qualifying country, including your home country.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5280-applying-permanent-residence-within-canada.html',
          urlLabel: 'IRCC police certificate guide',
        },
        {
          title: 'Obtain your home country certificate',
          detail: 'For Algeria: visit the nearest police station (commissariat) or gendarmerie where you were last registered. Bring your national ID. Processing typically takes 1-4 weeks. The document is called "Casier Judiciaire" or "Extrait de Casier Judiciaire B3".',
          tip: 'Some countries allow you to apply from abroad through their embassy. Check the IRCC country-specific guide.',
        },
        {
          title: 'Obtain certificates for other countries',
          detail: 'Each country has a different process. IRCC maintains a country-by-country guide with specific instructions. Look up each country you have lived in.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/police-certificates-immigration-applications.html',
          urlLabel: 'Country-by-country police certificate guide',
        },
        {
          title: 'Get certified translations if needed',
          detail: 'If your police certificate is not in English or French, you must have it translated by a certified translator. The translator must certify that the translation is accurate. Both the original and translation must be submitted.',
        },
      ],
      note: 'Police certificates must generally be less than 3 months old at the time of your final application submission.',
    },
  },
  {
    match: ['job offer', 'lmia', 'employer', 'employment offer', 'arranged employment', 'work permit', 'labour market impact'],
    guide: {
      overview: 'A qualifying job offer from a Canadian employer can add 50 or 200 CRS points to your Express Entry score, significantly increasing your chances of receiving an ITA. However, a job offer is not required for FSW.',
      steps: [
        {
          title: 'Understand the qualifying job offer requirements',
          detail: 'To qualify, the offer must be: full-time, for at least one year, at a skilled NOC TEER 0, 1, 2, or 3 occupation, and either LMIA-supported or LMIA-exempt (under certain agreements).',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/offer-employment.html',
          urlLabel: 'Job offer requirements',
        },
        {
          title: 'Ask your employer to apply for an LMIA (if required)',
          detail: 'For most job offers, the Canadian employer must obtain a positive Labour Market Impact Assessment (LMIA) from Employment and Social Development Canada. This confirms no suitable Canadian workers were available. The employer applies, not you.',
          url: 'https://www.canada.ca/en/employment-social-development/services/foreign-workers/median-wage/positive/instructions.html',
          urlLabel: 'LMIA employer application guide',
        },
        {
          title: 'Verify LMIA-exempt options',
          detail: 'If you work for a multinational company, or qualify under CUSMA/USMCA, or other international agreements, your job offer may be LMIA-exempt. Check the exemption categories.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/foreign-workers/exemption-codes.html',
          urlLabel: 'LMIA exemption categories',
        },
        {
          title: 'Receive job offer confirmation letter',
          detail: 'Once the LMIA is approved, your employer provides you with a job offer letter and the LMIA number. You enter this in your Express Entry profile to receive the additional CRS points.',
        },
      ],
    },
  },
  {
    match: ['medical exam', 'medical examination', 'immigration medical', 'panel physician', 'health exam'],
    guide: {
      overview: 'An immigration medical exam is required as part of your permanent residence application. You must use an IRCC-approved panel physician.',
      steps: [
        {
          title: 'Find a designated panel physician near you',
          detail: 'IRCC maintains a list of approved panel physicians in every country. Use the online tool to find one near you.',
          url: 'https://secure.cic.gc.ca/PanelPhysicianMedecinDesigne/en/Home',
          urlLabel: 'Find panel physician',
        },
        {
          title: 'Book your appointment',
          detail: 'Contact the panel physician directly to book. Bring all family members who are included in your application. Results are valid for 12 months.',
          tip: 'Do not book your medical exam until you have received your ITA — the 12-month validity period starts from exam date.',
        },
        {
          title: 'Attend the medical exam',
          detail: 'The physician will complete a standard examination including blood tests, chest X-ray, physical exam, and review of vaccination records. Bring: valid passport, list of current medications, vaccination records, and glasses/contacts if applicable.',
        },
        {
          title: 'Results sent directly to IRCC',
          detail: 'The panel physician submits your results directly to IRCC electronically. You will receive a copy for your records. You do not need to submit medical results yourself.',
        },
      ],
    },
  },
  {
    match: ['biometric', 'fingerprint', 'photo', 'biometrics'],
    guide: {
      overview: 'After submitting your permanent residence application, IRCC will send you a Biometrics Instruction Letter (BIL) asking you to provide fingerprints and a photo at an authorized service point.',
      steps: [
        {
          title: 'Wait for your Biometrics Instruction Letter (BIL)',
          detail: 'IRCC will send the BIL to the email address on your application after you submit your PR application. Do not book an appointment before receiving the BIL — it contains your unique reference number.',
        },
        {
          title: 'Find an authorized biometrics collection point',
          detail: 'Use the IRCC tool to find a Visa Application Centre (VAC) or Application Support Centre (ASC) near you. Collection points are available in most major cities worldwide.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5540-collecting-biometrics.html',
          urlLabel: 'Find a biometrics collection point',
        },
        {
          title: 'Book and attend your appointment',
          detail: 'Book your appointment online through the VAC or ASC website. Bring: your BIL, valid passport, and any other documents listed in the BIL. The appointment takes about 15-20 minutes.',
          tip: 'Book as soon as you receive the BIL. You have 30 days to provide biometrics.',
        },
      ],
    },
  },
  {
    match: ['provincial nominee', 'pnp', 'provincial nomination', 'expression of interest province', 'ontario immigrant nominee', 'bc pnp', 'alberta advantage'],
    guide: {
      overview: 'Provincial Nominee Programs (PNPs) allow individual provinces to nominate immigrants based on their specific labour market needs. A provincial nomination adds 600 CRS points — virtually guaranteeing an ITA.',
      steps: [
        {
          title: 'Identify which province and stream to apply to',
          detail: 'Each province has multiple streams for different worker profiles. Research which provinces have streams matching your occupation and experience. Ontario and BC have the most streams.',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees/works.html',
          urlLabel: 'Overview of all PNP programs',
        },
        {
          title: 'Create a profile in the provincial Expression of Interest system',
          detail: 'Most provinces run their own EOI draw system separate from the federal Express Entry pool. Create a profile in the relevant provincial system and wait for an invitation to apply.',
        },
        {
          title: 'Receive and accept a provincial invitation',
          detail: 'If the province invites you, you typically have 30-60 days to submit a full provincial application with supporting documents.',
        },
        {
          title: 'Receive your provincial nomination certificate',
          detail: 'Once provincially approved, you receive a nomination certificate. Enter this in your federal Express Entry profile — this triggers an ITA in the next federal draw.',
        },
      ],
    },
  },
]

function matchGuide(step: RecommendedRoadmapStep): StepGuide | null {
  const haystack = `${step.id} ${step.title}`.toLowerCase()
  for (const { match, guide } of GUIDES) {
    if (match.some((kw) => haystack.includes(kw))) return guide
  }
  return null
}

// ── Status selector ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Array<{
  value: StepStatus
  label: string
  sublabel: string
  icon: React.ReactNode
  activeClass: string
  inactiveClass: string
}> = [
  {
    value: 'not_started',
    label: 'Not started',
    sublabel: 'Waiting',
    icon: <Circle size={16} strokeWidth={2} />,
    activeClass: 'bg-[#F5F5F5] border-[#D4D4D4] text-[#525252]',
    inactiveClass: 'bg-white border-[#E5E5E5] text-[#A3A3A3] hover:border-[#D4D4D4] hover:text-[#525252]',
  },
  {
    value: 'in_progress',
    label: 'In progress',
    sublabel: 'Working on it',
    icon: <Clock size={16} strokeWidth={2} />,
    activeClass: 'bg-[#EEEDFE] border-[#534AB7] text-[#534AB7]',
    inactiveClass: 'bg-white border-[#E5E5E5] text-[#A3A3A3] hover:border-[#534AB7]/40 hover:text-[#534AB7]',
  },
  {
    value: 'done',
    label: 'Done',
    sublabel: 'Completed',
    icon: <CheckCircle2 size={16} strokeWidth={2} />,
    activeClass: 'bg-[#F0FDF7] border-[#1D9E75] text-[#1D9E75]',
    inactiveClass: 'bg-white border-[#E5E5E5] text-[#A3A3A3] hover:border-[#1D9E75]/40 hover:text-[#1D9E75]',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function RoadmapStepPage({
  step,
  initialStatus,
  onSaved,
}: {
  step: RecommendedRoadmapStep
  initialStatus: StepStatus
  onSaved: (stepId: string, status: StepStatus) => void
}) {
  const [status, setStatus] = useState<StepStatus>(initialStatus)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSubSteps, setExpandedSubSteps] = useState<Set<number>>(new Set([0]))

  useEffect(() => {
    setStatus(initialStatus)
    setExpandedSubSteps(new Set([0]))
  }, [step.id, initialStatus])

  const setStatusAndPersist = async (next: StepStatus) => {
    if (pending || next === status) return
    const prev = status
    setStatus(next)
    onSaved(step.id, next)
    setError(null)
    setPending(true)
    try {
      await updateRoadmapStep(step.id, next)
    } catch {
      setStatus(prev)
      onSaved(step.id, prev)
      setError('Could not save — try again.')
    } finally {
      setPending(false)
    }
  }

  const guide = matchGuide(step)

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-[13px] text-[#525252] leading-relaxed">{step.description}</p>

      {/* Status selector — prominent cards */}
      <div>
        <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">Your progress</p>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_CONFIG.map(({ value, label, sublabel, icon, activeClass, inactiveClass }) => {
            const isActive = status === value
            return (
              <motion.button
                key={value}
                type="button"
                disabled={pending}
                onClick={() => void setStatusAndPersist(value)}
                whileTap={{ scale: 0.97 }}
                className={`relative flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-2xl border-2 text-center transition-all duration-150 disabled:opacity-60 ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                <div className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
                  {icon}
                </div>
                <div>
                  <p className="text-[12px] font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{sublabel}</p>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="status-indicator"
                    className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                    style={{ background: value === 'done' ? '#1D9E75' : value === 'in_progress' ? '#534AB7' : '#A3A3A3' }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
        {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-[#737373] border-t border-[#F0F0F0] pt-4">
        <span>
          <span className="text-[#A3A3A3]">Estimated time: </span>
          <span className="font-medium text-[#525252]">{step.estimatedTime}</span>
        </span>
        {step.dependencies.length > 0 && (
          <span>
            <span className="text-[#A3A3A3]">Depends on: </span>
            <span className="font-medium text-[#525252]">{step.dependencies.join(', ')}</span>
          </span>
        )}
        {step.officialUrl && (
          <a
            href={step.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#534AB7] hover:text-[#3C3489] font-medium transition-colors"
          >
            Official IRCC page <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Step-by-step guide */}
      {guide ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">Step-by-step guide</p>
            <div className="flex-1 h-px bg-[#F0F0F0]" />
          </div>

          <p className="text-[12px] text-[#737373] leading-relaxed">{guide.overview}</p>

          <div className="space-y-2">
            {guide.steps.map((sub, idx) => {
              const isOpen = expandedSubSteps.has(idx)
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSubSteps((prev) => {
                      const next = new Set(prev)
                      if (next.has(idx)) next.delete(idx); else next.add(idx)
                      return next
                    })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#EEEDFE] text-[#534AB7] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-[#171717]">{sub.title}</span>
                    {isOpen ? <ChevronUp size={14} className="text-[#A3A3A3] flex-shrink-0" /> : <ChevronDown size={14} className="text-[#A3A3A3] flex-shrink-0" />}
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="px-4 pb-4 space-y-3 border-t border-[#F5F5F5]"
                    >
                      <p className="text-[12px] text-[#525252] leading-relaxed pt-3">{sub.detail}</p>

                      {sub.tip && (
                        <div className="flex items-start gap-2 p-2.5 bg-[#FFFBEB] border border-[#FDE68A]/60 rounded-lg">
                          <AlertCircle size={12} className="text-[#D97706] mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-[#92400E] leading-snug">{sub.tip}</p>
                        </div>
                      )}

                      {sub.url && (
                        <a
                          href={sub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#534AB7] text-white text-[12px] font-semibold rounded-full hover:bg-[#3C3489] transition-colors shadow-sm shadow-[#534AB7]/20"
                        >
                          {sub.urlLabel ?? 'Open link'} <ExternalLink size={11} />
                        </a>
                      )}
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>

          {guide.note && (
            <div className="flex items-start gap-2 p-3 bg-[#F4F2FF] border border-[#C5BFFF]/40 rounded-xl">
              <AlertCircle size={13} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#534AB7] leading-relaxed">{guide.note}</p>
            </div>
          )}
        </div>
      ) : (
        /* Fallback for steps without a matching guide */
        step.documents && step.documents.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">Documents to prepare</p>
              <div className="flex-1 h-px bg-[#F0F0F0]" />
            </div>
            <div className="space-y-1.5">
              {step.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-[#EBEBEB] rounded-xl text-[13px] text-[#525252]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4D4D4] flex-shrink-0" />
                  {doc}
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
