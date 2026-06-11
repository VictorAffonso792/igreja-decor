/* ===== SUPABASE — CAMADA DE PERSISTÊNCIA ===== */
let _sb = null;
function getSupabase() {
  if (_sb) return _sb;
  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase JS não carregou. Verifique a conexão.');
    return null;
  }
  _sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  return _sb;
}

const BUCKET = CONFIG.supabaseBucket;
let _cacheGaleria = null;
let _cacheTs = 0;
const CACHE_TTL = 5000;

async function carregarFotos(forceRefresh) {
  const sb = getSupabase();
  if (!sb) return [];

  const now = Date.now();
  if (!forceRefresh && _cacheGaleria && (now - _cacheTs < CACHE_TTL)) {
    return _cacheGaleria;
  }
  try {
    const { data, error } = await sb
      .from('fotos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    _cacheGaleria = data || [];
    _cacheTs = now;
    return _cacheGaleria;
  } catch (e) {
    console.error('Erro ao carregar fotos:', e);
    return _cacheGaleria || [];
  }
}

async function uploadFoto(file, cat, titulo) {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const nome = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(nome, file, { contentType: file.type, upsert: false });
    if (upErr) throw upErr;

    const { data: urlData } = sb.storage
      .from(BUCKET)
      .getPublicUrl(nome);
    const src = urlData.publicUrl;

    const { data, error: dbErr } = await sb
      .from('fotos')
      .insert({ src, cat, titulo: titulo || '' })
      .select()
      .single();
    if (dbErr) throw dbErr;

    _cacheGaleria = null;
    return data;
  } catch (e) {
    console.error('Erro no upload:', e);
    mostrarToast('Erro ao enviar foto 🌧️ Tente novamente.');
    return null;
  }
}

async function excluirFoto(id, src) {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const partes = src.split('/');
    const nomeArquivo = partes[partes.length - 1];
    await sb.storage.from(BUCKET).remove([nomeArquivo]);
    const { error } = await sb.from('fotos').delete().eq('id', id);
    if (error) throw error;
    _cacheGaleria = null;
    return true;
  } catch (e) {
    console.error('Erro ao excluir:', e);
    mostrarToast('Erro ao excluir foto 🌧️');
    return false;
  }
}
