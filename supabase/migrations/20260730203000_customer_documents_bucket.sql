-- Storage bucket created via Storage API (customer-documents).
-- Document metadata lives in Redis/file registry (slf:documents); binaries in this bucket.
-- Path pattern: {applicationId}/{slot}-{fileName}

-- Ensure bucket exists (no-op if already created by API):
-- insert into storage.buckets (id, name, public, file_size_limit)
-- values ('customer-documents', 'customer-documents', false, 15728640)
-- on conflict (id) do nothing;
