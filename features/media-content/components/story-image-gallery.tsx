import { PhotoLightbox } from "@/features/media/components/photo-lightbox";

export function StoryImageGallery({
  images,
  storyTitle,
}: {
  images: { objectKey: string; imageUrl: string | null }[];
  storyTitle: string;
}) {
  const visibleImages = images.filter(
    (image): image is { objectKey: string; imageUrl: string } =>
      Boolean(image.imageUrl),
  );
  if (!visibleImages.length) return null;
  return (
    <section
      aria-label={`${storyTitle} 图集`}
      className="mt-12 max-w-full border-t border-[#d2d2d2] pt-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleImages.map((image, index) => (
          <PhotoLightbox
            activation="double-click"
            alt={`${storyTitle}（第 ${index + 1} 张）`}
            className="aspect-[3/2] w-full object-cover"
            key={image.objectKey}
            src={image.imageUrl}
          />
        ))}
      </div>
    </section>
  );
}
