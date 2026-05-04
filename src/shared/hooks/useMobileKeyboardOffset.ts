import {useEffect, useState} from 'react';

export function useMobileKeyboardOffset(): {offset: number; vvHeight: number} {
    const [offset, setOffset] = useState(0);
    const [vvHeight, setVvHeight] = useState(
        () => window.visualViewport?.height ?? window.innerHeight,
    );

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const update = () => {
            setOffset(Math.max(0, window.innerHeight - vv.height - (vv.offsetTop ?? 0)));
            setVvHeight(vv.height);
        };

        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        update();

        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, []);

    return {offset, vvHeight};
}
