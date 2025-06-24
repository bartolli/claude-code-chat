import React, { useEffect, useState } from "react";
const SafeImg = ({ src, height, width, className, fallback, }) => {
    const [hasError, setHasError] = useState(false);
    const [cachedSrc, setCachedSrc] = useState(null);
    useEffect(() => {
        const cachedImage = localStorage.getItem(src);
        if (cachedImage) {
            console.log("Using cached image");
            setCachedSrc(cachedImage);
        }
        else {
            fetch(src)
                .then((response) => response.blob())
                .then((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    localStorage.setItem(src, reader.result);
                    setCachedSrc(reader.result);
                };
                reader.readAsDataURL(blob);
            })
                .catch((error) => {
                // console.error("Error fetching image:", error);
            });
        }
    }, [src]);
    const handleError = () => {
        setHasError(true);
        setCachedSrc(null);
    };
    return (<>
      {!hasError ? (<img src={cachedSrc || src} height={height} width={width} className={className} onError={handleError}/>) : (fallback)}
    </>);
};
export default SafeImg;
//# sourceMappingURL=SafeImg.js.map