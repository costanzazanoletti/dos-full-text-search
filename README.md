# Search engine with PostgreSQL full-text search functions

## Documentation

https://www.postgresql.org/docs/9.1/textsearch-indexes.html

## Database

In the db folder there is a sql script with the queries required to set the database up

1. Add column "document_vectors" to Service table with index of type GIN

2. Initialize "document_vectors" with the list of indexed lexemes (to_tsvector) created from concatenation of relevant columns (using joins to get infos from other tables). Use setweight function to set priorities on the selected columns

3. Add a trigger which fires on insert which auto-generates the tsvector field for each newly inserted entry

4. Update the seed and init scripts with these structural changes using knex raw since Objection does not support these functions and structure

## Backend

Create search API adding a new POST (the search term is a body parameter). The API performs a query using the to_tsquery function and ts_rank or ts_rank_cd function. The search terms coming from the body parameter must be processed with the plainto_tsquery function

## Frontend

Cleanup HomeSearch.js from full-text filtering functions
When the Search button is clicked, then call the search POST API. Pass the search string in a body parameter and populate the services list with the response data
Keep at frontend side the Category filter function

## Next steps

Move the postcode search function to the backend side
