/* ===== SUPABASE — CAMADA DE PERSISTÊNCIA ===== */
const supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
const BUCKET = CONFIG.supabaseBucket;

/* Cache local para evitar requests repetidos */
let _cacheGaleria = null;
let _cacheTs = 0;
const CACHE_TTL = 5000; // 5s

async function carregarFotos(forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && _cacheGaleria && (now - _cacheTs < CACHE_TTL)) {
    return _cacheGaleria;
  }
  try {
    const { data, error } = await supabase
      .from('fotos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    _cacheGaleria = data || [];
    _cacheTs = now;
    return _cacheGaleria;
  } catch (e) {
    console.error('Erro ao carregar fotos:', e);
    mostrarToast('Erro ao carregar fotos 🌧️');
    return _cacheGaleria || [];
  }
}

async function uploadFoto(file, cat, titulo) {
  try {
    /* Nome único para o arquivo */
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const nome = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;

    /* Upload para o Storage */
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(nome, file, { contentType: file.type, upsert: false });
    if (upErr) throw upErr;

    /* URL pública da imagem */
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(nome);
    const src = urlData.publicUrl;

    /* Inserir no banco de dados */
    const { data, error: dbErr } = await supabase
      .from('fotos')
      .insert({ src, cat, titulo: titulo || '' })
      .select()
      .single();
    if (dbErr) throw dbErr;

    _cacheGaleria = null; // invalida cache
    return data;
  } catch (e) {
    console.error('Erro no upload:', e);
    mostrarToast('Erro ao enviar foto 🌧️ Tente novamente.');
    return null;
  }
}

async function excluirFoto(id, src) {
  try {
    /* Extrair nome do arquivo da URL */
    const partes = src.split('/');
    const nomeArquivo = partes[partes.length - 1];

    /* Deletar do Storage */
    await supabase.storage.from(BUCKET).remove([nomeArquivo]);

    /* Deletar do banco */
    const { error } = await supabase.from('fotos').delete().eq('id', id);
    if (error) throw error;

    _cacheGaleria = null;
    return true;
  } catch (e) {
    console.error('Erro ao excluir:', e);
    mostrarToast('Erro ao excluir foto 🌧️');
    return false;
  }
}
