import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src="/images/logo.png"
            alt="AMPING Telekonsulta Logo"
            className={`object-contain ${props.className || ''}`}
        />
    );
}
