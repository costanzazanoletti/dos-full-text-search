# Search engine with PostgreSQL full-text search functions and PostGIS

## Documentation

https://www.postgresql.org/docs/9.1/textsearch-indexes.html
https://postgis.net/docs/

## Database

In the db folder there is a sql script with the queries required to set the database up

1. Add column "document_vectors" to Service table with index of type GIN

2. Initialize "document_vectors" with the list of indexed lexemes (to_tsvector) created from concatenation of relevant columns (using joins to get infos from other tables). Use setweight function to set priorities on the selected columns

3. Add a trigger which fires on insert which auto-generates the tsvector field for each newly inserted entry

4. Update the seed and init scripts with these structural changes using knex raw since Objection does not support these functions and structure

5. Enable PostGIS on database

6. Set geometry on Location table

7. Import UK postcodes with coordinates and set geometry

8. Add trigger on Location insert to set the geometry column

9. Add API for postcodes CRUD

## Backend

Create search API adding a new POST (the keywords and postocode are body parameters).
The API performs a query using the to_tsquery function and ts_rank or ts_rank_cd function. The keywords coming from the body parameter must be processed with the plainto_tsquery function.
If postcode is provided in the request, the sorting of the results is performed by distance and by ranking

## Frontend

Cleanup HomeSearch.js from full-text and filtering functions
When the Search button is clicked, then call the search POST API. Pass the search string in a body parameter and populate the services list with the response data

## Next steps

Move to the back end side also search by category
