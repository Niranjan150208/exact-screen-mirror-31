drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert" on public.notifications for insert to authenticated
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "logs insert" on public.activity_logs;
create policy "logs insert" on public.activity_logs for insert to authenticated
  with check (actor_id = auth.uid());

drop policy if exists "item photos readable" on storage.objects;
create policy "item photos readable" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'item-photos' and (
      owner = auth.uid()
      or exists (select 1 from public.items i where i.photo_url = storage.objects.name and i.status <> 'removed')
      or public.has_role(auth.uid(), 'admin')
    )
  );

drop policy if exists "item photos upload" on storage.objects;
create policy "item photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);