GRANT DELETE ON public.support_messages TO authenticated;

CREATE POLICY "admin delete chat"
ON public.support_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));