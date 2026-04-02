"""
sources.py — Master list of all Canadian immigration sources to scrape.

Organized by category with metadata used downstream for:
  - Profile-aware RAG filtering (visa_types, programs)
  - Staleness detection (high_change pages get tighter refresh windows)
  - UI citations (display_name, section)
"""

IRCC_SOURCES = [

    # ─────────────────────────────────────────────────
    # EXPRESS ENTRY
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
        "display_name": "Express Entry — Overview",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility.html",
        "display_name": "Express Entry — Eligibility",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html",
        "display_name": "Federal Skilled Worker Program — Requirements",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FSW"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/canadian-experience-class.html",
        "display_name": "Canadian Experience Class — Requirements",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["CEC"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-trades.html",
        "display_name": "Federal Skilled Trades Program — Requirements",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FST"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/works.html",
        "display_name": "How Express Entry Works",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html",
        "display_name": "Express Entry — Create a Profile",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html",
        "display_name": "Express Entry — Rounds of Invitations (ITA draws)",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": True,  # Draw results update every ~2 weeks
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents.html",
        "display_name": "Express Entry — Documents You Need",
        "section": "Express Entry",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # CRS POINTS & SCORING
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system/grid.html",
        "display_name": "CRS Points Grid — Full Breakdown",
        "section": "CRS Score",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system.html",
        "display_name": "Comprehensive Ranking System (CRS) — Overview",
        "section": "CRS Score",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # PROVINCIAL NOMINEE PROGRAMS (PNP)
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
        "display_name": "Provincial Nominee Program — Overview",
        "section": "PNP",
        "visa_types": ["pnp"],
        "programs": ["PNP"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees/works.html",
        "display_name": "PNP — How It Works",
        "section": "PNP",
        "visa_types": ["pnp"],
        "programs": ["PNP"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # WORK PERMITS
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html",
        "display_name": "Work Permits — Overview",
        "section": "Work Permits",
        "visa_types": ["work_permit"],
        "programs": ["LMIA", "LMIA-exempt"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit/temporary/eligibility.html",
        "display_name": "Temporary Work Permit — Eligibility",
        "section": "Work Permits",
        "visa_types": ["work_permit"],
        "programs": ["LMIA", "LMIA-exempt"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit/temporary/need-work-permit.html",
        "display_name": "Do You Need a Work Permit?",
        "section": "Work Permits",
        "visa_types": ["work_permit"],
        "programs": ["LMIA", "LMIA-exempt"],
        "high_change": False,
        "priority": 2,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit/temporary/open-work-permit.html",
        "display_name": "Open Work Permit — Overview",
        "section": "Work Permits",
        "visa_types": ["work_permit", "open_work_permit"],
        "programs": ["OWP"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # POST-GRADUATION WORK PERMIT (PGWP)
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html",
        "display_name": "Post-Graduation Work Permit (PGWP) — Overview",
        "section": "PGWP",
        "visa_types": ["pgwp", "work_permit"],
        "programs": ["PGWP"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/eligibility.html",
        "display_name": "PGWP — Eligibility",
        "section": "PGWP",
        "visa_types": ["pgwp", "work_permit"],
        "programs": ["PGWP"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # STUDY PERMITS
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
        "display_name": "Study Permit — Overview",
        "section": "Study",
        "visa_types": ["study_permit"],
        "programs": ["study"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html",
        "display_name": "Study Permit — Documents Required",
        "section": "Study",
        "visa_types": ["study_permit"],
        "programs": ["study"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # PERMANENT RESIDENCE — PATHWAYS
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html",
        "display_name": "Immigrate to Canada — All Pathways",
        "section": "Permanent Residence",
        "visa_types": ["pr"],
        "programs": ["FSW", "CEC", "FST", "PNP", "AIP", "Atlantic"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-northern-immigration-pilot.html",
        "display_name": "Rural and Northern Immigration Pilot",
        "section": "Permanent Residence",
        "visa_types": ["pr"],
        "programs": ["RNIP"],
        "high_change": False,
        "priority": 2,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
        "display_name": "Atlantic Immigration Program",
        "section": "Permanent Residence",
        "visa_types": ["pr"],
        "programs": ["AIP"],
        "high_change": False,
        "priority": 2,
    },

    # ─────────────────────────────────────────────────
    # FAMILY SPONSORSHIP
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html",
        "display_name": "Family Sponsorship — Overview",
        "section": "Family Sponsorship",
        "visa_types": ["family_sponsorship"],
        "programs": ["sponsorship"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children.html",
        "display_name": "Sponsor Your Spouse, Partner or Children",
        "section": "Family Sponsorship",
        "visa_types": ["family_sponsorship"],
        "programs": ["sponsorship"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # REFUGEE & ASYLUM
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees.html",
        "display_name": "Refugees and Asylum — Overview",
        "section": "Refugees",
        "visa_types": ["refugee", "asylum"],
        "programs": ["refugee", "asylum"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum-claims.html",
        "display_name": "Asylum Claims in Canada",
        "section": "Refugees",
        "visa_types": ["asylum"],
        "programs": ["asylum"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/canada-role.html",
        "display_name": "Canada's Refugee Protection System",
        "section": "Refugees",
        "visa_types": ["refugee"],
        "programs": ["refugee"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # CITIZENSHIP
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship.html",
        "display_name": "Canadian Citizenship — Overview",
        "section": "Citizenship",
        "visa_types": ["citizenship"],
        "programs": ["citizenship"],
        "high_change": False,
        "priority": 1,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/become-canadian-citizen/eligibility.html",
        "display_name": "Canadian Citizenship — Eligibility Requirements",
        "section": "Citizenship",
        "visa_types": ["citizenship"],
        "programs": ["citizenship"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # PROCESSING TIMES (HIGH CHANGE — weekly)
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
        "display_name": "IRCC Processing Times",
        "section": "Processing Times",
        "visa_types": ["express_entry", "work_permit", "study_permit", "pr", "citizenship"],
        "programs": ["all"],
        "high_change": True,  # Updated weekly by IRCC
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # FEES
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence/fee.html",
        "display_name": "Express Entry — Application Fees",
        "section": "Fees",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # LANGUAGE TESTS
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements.html",
        "display_name": "Language Requirements for Express Entry",
        "section": "Language Tests",
        "visa_types": ["express_entry"],
        "programs": ["FSW", "CEC", "FST"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # CAIPS / APPLICATION STATUS
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html",
        "display_name": "IRCC Online Account — Check Application Status",
        "section": "Application Status",
        "visa_types": ["all"],
        "programs": ["all"],
        "high_change": False,
        "priority": 2,
    },

    # ─────────────────────────────────────────────────
    # NOC CODES
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/find-national-occupation-code.html",
        "display_name": "Find Your NOC Code",
        "section": "NOC Codes",
        "visa_types": ["express_entry", "work_permit"],
        "programs": ["FSW", "CEC"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # CREDENTIAL RECOGNITION
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/educational-credential-assessment.html",
        "display_name": "Educational Credential Assessment (ECA)",
        "section": "Credentials",
        "visa_types": ["express_entry"],
        "programs": ["FSW"],
        "high_change": False,
        "priority": 1,
    },

    # ─────────────────────────────────────────────────
    # BIOMETRICS & MEDICAL
    # ─────────────────────────────────────────────────
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/biometrics.html",
        "display_name": "Biometrics — Who Needs to Give Them",
        "section": "Biometrics & Medical",
        "visa_types": ["all"],
        "programs": ["all"],
        "high_change": False,
        "priority": 2,
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/medical-exams.html",
        "display_name": "Immigration Medical Examination",
        "section": "Biometrics & Medical",
        "visa_types": ["all"],
        "programs": ["all"],
        "high_change": False,
        "priority": 2,
    },
]

# Quick lookup: all unique sections
ALL_SECTIONS = list(set(s["section"] for s in IRCC_SOURCES))

# Quick lookup: high-change pages (refresh more aggressively)
HIGH_CHANGE_URLS = [s["url"] for s in IRCC_SOURCES if s["high_change"]]

print(f"Total sources: {len(IRCC_SOURCES)}")
print(f"High-change pages: {len(HIGH_CHANGE_URLS)}")
print(f"Sections: {ALL_SECTIONS}")
