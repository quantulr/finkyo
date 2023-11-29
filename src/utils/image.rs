use std::path::Path;

pub struct ImageDimensions {
    pub width: u32,
    pub height: u32,
}

pub fn get_image_size(path: &Path) -> Result<ImageDimensions, ()> {
    match image::image_dimensions(path) {
        Ok((width, height)) => Ok(ImageDimensions { width, height }),
        Err(_) => Err(()),
    }
}
