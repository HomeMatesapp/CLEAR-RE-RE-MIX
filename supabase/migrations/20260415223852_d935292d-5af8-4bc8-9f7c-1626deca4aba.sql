UPDATE pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    pathway_data::jsonb,
    '{training,alternative,apply_url}',
    '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=customer+acquisition"'
  ),
  '{training,degree_apprenticeship,apply_url}',
  '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=performance+marketing+degree"'
),
updated_at = now()
WHERE role_slug = 'customer-acquisition-specialist';

UPDATE saved_pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    pathway_data::jsonb,
    '{training,alternative,apply_url}',
    '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=customer+acquisition"'
  ),
  '{training,degree_apprenticeship,apply_url}',
  '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=performance+marketing+degree"'
)
WHERE role_slug = 'customer-acquisition-specialist';