#ifndef SYMMETRIC_FIR_H
#define SYMMETRIC_FIR_H

#if defined(__cplusplus)
extern "C" {
#endif

#ifndef FIR_FLOAT
#define FIR_FLOAT float
#endif

typedef FIR_FLOAT symfir_float_t;

/**
 * Computes the output of a symmetric FIR filter. The input and output buffers may be the same buffer (in-place
 * filtering) but must not partially overlap.
 * @param coeffs Pointer to the filter coefficients. Only the first half (plus the middle one if the number of taps is
 * odd) must be provided.
 * @param num_taps The number of filter taps.
 * @param input Pointer to the input signal.
 * @param output Pointer to the output signal, at least length - num_taps + 1 samples.
 * @param length The length of the input signal.
 * @return The number of output samples computed, or -1 if coeffs, input or output is NULL, if num_taps <= 0, or if
 * the input length is less than the number of taps.
 */
static inline int symfir_filter_signal(const symfir_float_t *coeffs, int num_taps, const symfir_float_t *input,
                                       symfir_float_t *output, int length) {
    int has_middle = (num_taps % 2 != 0);
    int half_taps = num_taps / 2;

    if (!coeffs || !input || !output) {
        return -1;
    }
    if (num_taps <= 0) {
        return -1;
    }
    if (length < num_taps) {
        return -1;
    }

    for (int n = 0; n < length - num_taps + 1; ++n) {
        symfir_float_t acc = 0;
        for (int k = 0; k < half_taps; ++k) {
            acc += coeffs[k] * (input[n + k] + input[n + (num_taps - 1 - k)]);
        }
        if (has_middle) {
            acc += coeffs[half_taps] * input[n + half_taps];
        }
        output[n] = acc;
    }
    return length - num_taps + 1;
}

/**
 * Moves the input samples needed to continue filtering to the beginning of the input array.
 * Call this after symfir_filter_signal, then append the next block of input samples at the
 * returned offset and filter the array again to get a continuous output across blocks.
 * @param input Pointer to the input signal that was last passed to symfir_filter_signal.
 * @param length The length of the input signal that was last passed to symfir_filter_signal.
 * @param num_taps The number of filter taps.
 * @return The number of samples moved to the beginning of the input array, or -1 on invalid
 * arguments.
 */
static inline int symfir_shift_overlap(symfir_float_t *input, int length, int num_taps) {
    int overlap;

    if (!input || num_taps <= 0) {
        return -1;
    }

    overlap = num_taps - 1;
    if (length < overlap) {
        return -1;
    }
    for (int i = 0; i < overlap; ++i) {
        input[i] = input[length - overlap + i];
    }
    return overlap;
}

#if defined(__cplusplus)
}
#endif

#endif