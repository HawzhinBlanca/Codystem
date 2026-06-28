# Project Dashboard

## Open tasks (across all specs)
```dataview
TASK FROM "10-Specs"
WHERE !completed
SORT file.name ASC
```

## Active features
```dataview
TABLE status, owner, updated
FROM "10-Specs"
WHERE type = "feature" AND status != "done"
SORT updated DESC
```

## Recent decisions
```dataview
LIST FROM "20-Decisions" SORT file.ctime DESC LIMIT 10
```
