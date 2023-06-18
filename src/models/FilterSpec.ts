import { reactive } from 'vue'

// NO_POINTS is limited by max stack in Emscripten part, default 64 KB. The
// Emscripten part allocates 2 arrays of doubles (in, out), with each twice
// NO_POINTS elements -> 32 bytes per point -> increase stack size to have more
// than 2001 points.
export const NO_POINTS = 4001;

export class FilterBandSpec {
    freqBegin = 0;
    freqEnd = 0;
    desiredBegin = 0;
    desiredEnd = 0;
    weight = 0;
}
export class FilterBandError {
    noPoints = 0; // no of points in frequency response in this band
    maxError = 0; // max overshoot of magnitude response, in absolute value
    minError = 0; // max undershoot of magnitude response, in absolute value
    errorIntegral = 0; // integral of error squared divided by bandwidth
}

export class Filter {
    sampleFrequency = 1.0;
    bands: FilterBandSpec[] = [];
    errorPerBand: FilterBandError[] = [];

    taps: number[] = []; // filter taps
    fr: number[] = []; //< frequencies of frequency response
    hm: number[] = []; //< magnitudes of frequency response

    updateError(): void {
        const fr_hm = this.fr.map((value, index) => { return { x: value, y: this.hm[index] }; });
        this.errorPerBand = [];
        this.bands.forEach(value => {
            const m = (value.desiredEnd - value.desiredBegin) / (value.freqEnd - value.freqBegin);
            const c = value.desiredBegin - value.freqBegin * m;
            const fr_hm_filtered = fr_hm.filter(item => (item.x >= value.freqBegin && item.x <= value.freqEnd));
            const errors = fr_hm_filtered.map(item => item.y - Math.abs(c + m * item.x));

            // Calculate error integral using trapezoidal rule if there are at least 2 points
            let errorIntegral = 0;
            if (errors.length >= 2) {
                const e0 = errors[0];
                const e1 = errors[errors.length - 1];
                errorIntegral = 0.5 * (e0 * e0 + e1 * e1);
                for (let i = 1; i < errors.length - 1; i++) {
                    errorIntegral += errors[i] * errors[i];
                }
                errorIntegral /= (errors.length - 1);
            }
            this.errorPerBand.push({ noPoints: errors.length, maxError: Math.max(...errors), minError: Math.min(...errors), errorIntegral: errorIntegral });
        });
    }
}

// The filter spec is global state. Define it here to have it available in all components.
export const filterSpec = reactive(new Filter());