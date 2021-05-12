module.exports = {
  searchQuery: `
select 
o.org_name, 
adr.area, 
b.borough, 
b.project, 
b.clients, 
s.service,
s.process,
s.service_days,
adr.telephone,
adr.email_address,
o.website,
adr.postcode,
b.tag,
c.cat_concat, s.document_vectors,
ts_rank_cd(s.document_vectors, query) as rank
from "Service" s
join "service_cat_concat_view" c on c.service_id = s.id
join "Branch" b on s.branch_id = b.id
join "Organisation" o on b.org_id = o.id
join "Address" adr on adr.branch_id = b.id,
plainto_tsquery(:term) query
WHERE s.document_vectors @@ plainto_tsquery(:term)
order by rank desc;
`,

  searchQueryLocation: `
select
o.org_name, 
adr.area, 
b.borough, 
b.project, 
b.clients, 
s.service,
s.process,
s.service_days,
adr.telephone,
adr.email_address,
o.website,
adr.postcode,
b.tag,
c.cat_concat, 
s.document_vectors,
ts_rank_cd(s.document_vectors, query) as rank,
case when loc.geom is null then 999999999999999
else ST_DistanceSphere(loc.geom, pc.location)
end as distance
from postcode pc,
"Service" s
join service_cat_concat_view c on c.service_id = s.id
join "Branch" b on s.branch_id = b.id
left outer join "Address" adr on b.id = adr.branch_id
left outer join "Location" loc on adr.id = loc.address_id 
join "Organisation" o on b.org_id = o.id, 
plainto_tsquery(:term) query
WHERE s.document_vectors @@ plainto_tsquery(:term)
and pc.postcode = :postcode
order by distance, rank desc;
`,
};
