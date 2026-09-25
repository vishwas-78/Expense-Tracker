---
name: SQLModel query results
description: Reliable result handling for ORM entities, scalar aggregates, and multi-column queries.
---

Use explicit SQLAlchemy result APIs according to the expected shape: `Session.scalars(...).all()` for ORM objects, `Session.execute(...).scalar_one()` for one aggregate value, and `Session.execute(...).all()` for multi-column rows.

**Why:** In this project environment, `Session.exec(select(Model)).all()` returned row wrappers rather than model instances, and a one-column aggregate result also needed scalar extraction before conversion. Attribute access and decimal conversion otherwise failed at runtime.

**How to apply:** When adding database queries, check whether the consumer expects an entity, one scalar, or a row with multiple values; select the matching result API explicitly.