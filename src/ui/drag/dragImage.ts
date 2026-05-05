let transparentDragImage: HTMLImageElement | null = null;

export function hideNativeDragImage(dataTransfer: DataTransfer) {
  transparentDragImage ??= createTransparentDragImage();
  dataTransfer.setDragImage(transparentDragImage, 0, 0);
}

function createTransparentDragImage() {
  const image = new Image();
  image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  return image;
}
