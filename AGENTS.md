# Application rules
- Use the additive decimal columns as the authoritative persisted quantities; legacy integer columns are compatibility mirrors to keep existing clients working.
- Use shared thousandth-unit helpers and a draft-preserving quantity input for measured quantities so decimal entry and arithmetic stay consistent across online and offline paths.
- Store the unit on sale and purchase items so historical receipts retain the measurement unit.