interface Props {
  title: string
  text: string
  imageUrl?: string
}

const getBackgroundClass = (imageUrl?: string) => {
  if (!imageUrl) return 'description-wrap-bg-6'
  
  if (imageUrl.includes('bg-1.webp')) return 'description-wrap-bg-1'
  if (imageUrl.includes('bg-2.webp')) return 'description-wrap-bg-2'  
  if (imageUrl.includes('bg-3.webp')) return 'description-wrap-bg-3'
  if (imageUrl.includes('bg-4.webp')) return 'description-wrap-bg-4'
  if (imageUrl.includes('bg-5.webp')) return 'description-wrap-bg-5'
  if (imageUrl.includes('bg-6.webp')) return 'description-wrap-bg-6'
  
  return 'description-wrap-bg-6'
}

export const DescriptionFullHeight = ({ title, text, imageUrl }: Props) => (
  <div
    className={`description-wrap cursor-pointer ${getBackgroundClass(imageUrl)}`}
    style={{
      backgroundImage: imageUrl ? `url(${imageUrl})` : "url('/bg-6.webp')",
      maxWidth: '100%',
    }}
  >
    <h4
      className={`text-federant text-brown-light text-center text-m xl:text-xl`}
    >
      {title}
    </h4>
    <div
      className="text-description"
      dangerouslySetInnerHTML={{ __html: text }}
    />
    <div className="corner corner--small lt" />
    <div className="corner corner--small rt" />
    <div className="corner corner--small lb" />
    <div className="corner corner--small rb" />
  </div>
)
