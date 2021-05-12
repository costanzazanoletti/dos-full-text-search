/********************* Set up for full text functions search *********************/
-- 1. Add document vectors columm with GIN index (should be faster in search and slower in insert)
ALTER TABLE "Service" ADD "document_vectors" tsvector;
CREATE INDEX idx_fts_doc_vec ON "Service" USING gin(document_vectors);

-- 2. Add view for concatenation of categories
drop view if exists service_cat_concat_view;
create or replace view service_cat_concat_view as
select s.id as service_id, coalesce(string_agg(cat.cat_name, ' '), '') as cat_concat
from "Service" s left outer join "Categories" cat on s.id = cat.service_id
group by s.id;
ALTER VIEW service_cat_concat_view OWNER TO dos;

-- 3. Initialize the document vectors column with weighted column values
update "Service" s1
set document_vectors = 
setweight(to_tsvector(coalesce(o.org_name, '')), 'A') 	|| 
setweight(to_tsvector(coalesce(b.borough, '')),'C') 	|| 
setweight(to_tsvector(coalesce(b.project, '')),'C') 	|| 
setweight(to_tsvector(coalesce(b.clients, '')), 'B') 	|| 
setweight(to_tsvector(coalesce(b.tag, '')), 'C') 		|| 
setweight(to_tsvector(coalesce(s.service, '')), 'C')	||
setweight(to_tsvector(coalesce(cat.cat_concat, '')), 'B')
from "Service" s
join "service_cat_concat_view" cat on s.id = cat.service_id
join "Branch" b on s.branch_id = b.id
join "Organisation" o on b.org_id = o.id
where s.id = s1.id;

-- 4. Add to the table a trigger to update the tsvector column when the document content columns change
CREATE FUNCTION service_vector_trigger() RETURNS trigger AS $$
begin
  		SELECT
		setweight(to_tsvector(coalesce(o.org_name, '')), 'A') 	|| 
		setweight(to_tsvector(coalesce(b.borough, '')),'C') 	|| 
		setweight(to_tsvector(coalesce(b.project, '')),'C') 	|| 
		setweight(to_tsvector(coalesce(b.clients, '')), 'B') 	|| 
		setweight(to_tsvector(coalesce(b.tag, '')), 'C') 		|| 
		setweight(to_tsvector(coalesce(s.service, '')), 'C')	||
		setweight(to_tsvector(coalesce(cat.cat_concat, '')), 'B')
		into new.document_vectors		
		from "Branch" b 
		join "Organisation" o on b.org_id = o.id		
		join "service_cat_concat_view" cat on new.id = cat.service_id
		where new.branch_id = b.id;
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
    ON "Service" FOR EACH ROW EXECUTE PROCEDURE service_vector_trigger();


/********************* Set up for PostGIS location search *********************/
-- 1. Enable PostGIS (as of 3.0 contains just geometry/geography)
CREATE EXTENSION postgis;

-- 2. Add geometry column as POINT to Location table (use 4326 because is lat/lng)
SELECT AddGeometryColumn ('Location','geom',4326,'POINT',2);

-- 3. Update geometry column with latitude and longitude values
UPDATE "Location" SET geom = ST_SetSRID(ST_MakePoint(long::decimal, lat::decimal), 4326) where lat is not null and long is not null and lat <> '' and long <> '';

/* Add UK postcodes with geometry */
-- Download csv from https://www.doogal.co.uk/
-- Extract only first 4 columns to another csv
-- in bash cat postcodes.csv | cut -d \, -f1,2,3,4 > subset_postcodes.csv;   
-- convert file subset_postcodes.csv into a json object and split json into smaller files
-- 4. create postcode table
create table postcode(
        postcode varchar(10) unique primary key,
		in_use varchar(10),        
        latitude decimal(18,6),
		longitude decimal(18,6),
        location geometry
);
alter table postcode owner to dos;
-- 5. create trigger to update geometry on insert and update
CREATE FUNCTION postcode_geom_trigger() RETURNS trigger AS $$
begin
  	new.location := ST_SetSRID(ST_MakePoint(new.longitude::decimal, new.latitude::decimal),4326);
  	return new;
end
$$ LANGUAGE plpgsql;
CREATE TRIGGER postcodegeom BEFORE INSERT OR UPDATE
    ON "postcode" FOR EACH ROW EXECUTE PROCEDURE postcode_geom_trigger();
-- 6. Import postcodes from json files with api
/*********** End Add postcode geometry 2 ********************/

----------------------------------------------------------------------------------
-- example of search query with tsquery and ts_rank
select o.org_name, b.borough, b.clients, s.service,c.cat_concat, s.document_vectors,
ts_rank_cd(s.document_vectors, query) as rank
from "Service" s
join "service_cat_concat_view" c on c.service_id = s.id
join "Branch" b on s.branch_id = b.id
join "Organisation" o on b.org_id = o.id, 
plainto_tsquery('bayswater') query
WHERE s.document_vectors @@ plainto_tsquery('bayswater')
order by rank desc;
-- example of search query with tsquery and ts_rank and distance
select ad.postcode, o.org_name, b.borough, b.clients, s.service, c.cat_concat, s.document_vectors,
ts_rank_cd(s.document_vectors, query) as rank,
case when loc.geom is null then 999999999999999
else ST_DistanceSphere(loc.geom, pc.location)
end  as distance
from postcode pc,
"Service" s
join service_cat_concat_view c on c.service_id = s.id
join "Branch" b on s.branch_id = b.id
left outer join "Address" ad on b.id = ad.branch_id
left outer join "Location" loc on ad.id = loc.address_id 
join "Organisation" o on b.org_id = o.id, 
plainto_tsquery('homeless') query
WHERE s.document_vectors @@ plainto_tsquery('homeless')
and pc.postcode = 'W2 5LT'
order by distance, rank desc;
----------------------------------------------------------------------------------