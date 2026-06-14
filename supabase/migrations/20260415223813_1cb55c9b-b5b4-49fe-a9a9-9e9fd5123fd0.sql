UPDATE pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              pathway_data::jsonb,
              '{training,primary,provider}',
              '"CXL Institute, Reforge, or Growthmentor"'
            ),
            '{training,primary,why_recommended}',
            '"Hands-on training in paid acquisition, conversion optimisation, and growth strategy — with real campaign experience across Google, Meta, and LinkedIn ads"'
          ),
          '{training,alternative,provider}',
          '"Level 3 Digital Marketer or Level 4 Marketing Executive — with focus on paid acquisition and campaign performance"'
        ),
        '{training,optional_enhancement,self_taught_warning}',
        '"This certificate alone will not get you hired — UK employers hiring for customer acquisition roles want to see 3+ real campaigns with measurable CAC, ROAS, or conversion rate results"'
      ),
      '{training,degree_apprenticeship,why_recommended}',
      '"Combines hands-on acquisition campaign experience with strategic business and data analysis skills — ideal for those wanting a long-term growth marketing career"'
    ),
    '{training,alternative,name}',
    '"Level 3 Digital Marketer or Level 4 Marketing Executive Apprenticeship"'
  ),
  '{training,primary,funded_regions}',
  '["Providers include: CXL Institute, Reforge, Growthmentor, and Google Skillshop"]'
),
updated_at = now()
WHERE role_slug = 'customer-acquisition-specialist';

UPDATE saved_pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              pathway_data::jsonb,
              '{training,primary,provider}',
              '"CXL Institute, Reforge, or Growthmentor"'
            ),
            '{training,primary,why_recommended}',
            '"Hands-on training in paid acquisition, conversion optimisation, and growth strategy — with real campaign experience across Google, Meta, and LinkedIn ads"'
          ),
          '{training,alternative,provider}',
          '"Level 3 Digital Marketer or Level 4 Marketing Executive — with focus on paid acquisition and campaign performance"'
        ),
        '{training,optional_enhancement,self_taught_warning}',
        '"This certificate alone will not get you hired — UK employers hiring for customer acquisition roles want to see 3+ real campaigns with measurable CAC, ROAS, or conversion rate results"'
      ),
      '{training,degree_apprenticeship,why_recommended}',
      '"Combines hands-on acquisition campaign experience with strategic business and data analysis skills — ideal for those wanting a long-term growth marketing career"'
    ),
    '{training,alternative,name}',
    '"Level 3 Digital Marketer or Level 4 Marketing Executive Apprenticeship"'
  ),
  '{training,primary,funded_regions}',
  '["Providers include: CXL Institute, Reforge, Growthmentor, and Google Skillshop"]'
)
WHERE role_slug = 'customer-acquisition-specialist';