export const translateText = async (
  text: string,
  targetLang: string
): Promise<string> => {
  const url = `${process.env.LIBRE_TRANSLATE_URL}/translate`
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'html',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    console.log(res)

    const jsonResponse = await res.json()
    return jsonResponse.translatedText
  } catch (error) {
    console.error('Translation error:', error)
    throw new Error('Translation failed')
  }
}
