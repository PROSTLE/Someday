-- List covers are public images with unguessable paths. They hold no personal data.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('list-covers', 'list-covers', true, 5000000, array['image/jpeg'])
on conflict (id) do nothing;
