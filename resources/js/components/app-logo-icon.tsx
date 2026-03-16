import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(
    props: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>,
) {
    return (
        <img
            {...props}
            src="/images/logo.png"
            alt="AMPING Telekonsulta Logo"
            className={`object-contain ${props.className || ''}`}
        />
    );
}
