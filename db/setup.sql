-- 1. Add document vectors columm with GIN index (should be faster in search and slower in insert)
ALTER TABLE "Service" ADD "document_vectors" tsvector;
CREATE INDEX idx_fts_doc_vec ON "Service" USING gin(document_vectors);

-- 2. Initialize the document vectors column with weighted column values
update "Service" s1
set document_vectors = 
setweight(to_tsvector(coalesce(o.org_name, '')), 'A') 	|| 
setweight(to_tsvector(coalesce(b.borough, '')),'B') 	|| 
setweight(to_tsvector(coalesce(b.project, '')),'C') 	|| 
setweight(to_tsvector(coalesce(b.clients, '')), 'D') 	|| 
setweight(to_tsvector(coalesce(b.tag, '')), 'C') 		|| 
setweight(to_tsvector(coalesce(s.service, '')), 'B')	
from "Service" s
join "Branch" b on s.branch_id = b.id
join "Organisation" o on b.org_id = o.id 
where s.id = s1.id;

-- 3. Add to the table a trigger to update the tsvector column when the document content columns change
CREATE FUNCTION service_vector_trigger() RETURNS trigger AS $$
begin
  		SELECT
		setweight(to_tsvector(coalesce(o.org_name, '')), 'A') 	|| 
		setweight(to_tsvector(coalesce(b.borough, '')),'B') 	|| 
		setweight(to_tsvector(coalesce(b.project, '')),'C') 	|| 
		setweight(to_tsvector(coalesce(b.clients, '')), 'D') 	|| 
		setweight(to_tsvector(coalesce(b.tag, '')), 'C') 		|| 
		setweight(to_tsvector(coalesce(new.service, '')), 'B')	
		into new.document_vectors		
		from "Branch" b 
		join "Organisation" o on b.org_id = o.id
		where new.branch_id = b.id;
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
    ON "Service" FOR EACH ROW EXECUTE PROCEDURE service_vector_trigger();

----------------------------------------------------------------------------------
-- example of search query with tsquery and ts_rank
select o.org_name, b.borough, b.clients, s.service,c.cat_name, s.document_vectors,
ts_rank_cd(s.document_vectors, query) as rank
from "Service" s
join "Categories" c on c.service_id = s.id
join "Branch" b on s.branch_id = b.id
join "Organisation" o on b.org_id = o.id, 
plainto_tsquery('london refugee') query
WHERE s.document_vectors @@ plainto_tsquery('london refugee')
order by rank desc;