export async function safeFetchJson(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    
    let data: any = null;
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
    } else {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: text || `HTTP Error ${res.status}` };
      }
    }
    
    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: { error: err.message || 'सञ्जाल सम्पर्कमा समस्या आयो।' }
    };
  }
}
