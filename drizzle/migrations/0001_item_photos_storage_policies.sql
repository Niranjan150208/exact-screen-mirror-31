
create policy "item photos readable" on storage.objects for select to anon, authenticated using (bucket_id = 'item-photos');
create policy "item photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'item-photos');
create policy "item photos owner update" on storage.objects for update to authenticated using (bucket_id = 'item-photos' and owner = auth.uid());
create policy "item photos owner delete" on storage.objects for delete to authenticated using (bucket_id = 'item-photos' and owner = auth.uid());
