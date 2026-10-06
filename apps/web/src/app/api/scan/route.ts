import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { prepareImage, analyzeFridgeImage } from '@/lib/vision';
import { jsonError, serverError, unauthorized } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** POST multipart/form-data con campo `image` → `{ ingredients, scanId }`. */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError('Please upload a photo of your fridge.');
    }

    const file = form.get('image');
    if (!(file instanceof File) || file.size === 0) return jsonError('Please upload a photo of your fridge.');
    if (!file.type.startsWith('image/')) return jsonError('That file is not an image. Try a JPG or PNG photo.');
    if (file.size > MAX_UPLOAD_BYTES) return jsonError('This photo is too large (max 10 MB).', 413);

    const image = await prepareImage(Buffer.from(await file.arrayBuffer()), file.type);
    const { ingredients, provider } = await analyzeFridgeImage(image);

    // Il salvataggio della sessione non deve bloccare il risultato per l'utente.
    const { data: session, error } = await auth.supabase
      .from('scan_sessions')
      .insert({
        user_id: auth.user.id,
        raw_result: { ingredients, provider },
        status: ingredients.length ? 'pending' : 'failed',
        provider,
      })
      .select('id')
      .single<{ id: string }>();
    if (error) console.error('[api:scan] could not save scan session', error.message);

    return NextResponse.json({ ingredients, scanId: session?.id ?? null });
  } catch (error) {
    return serverError('scan', error, 'We could not analyze this photo. Please try again.');
  }
}
