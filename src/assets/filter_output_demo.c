#include <math.h>
#include <stdio.h>

#define FIR_FLOAT float
#include "symfir.h"

#include "filter_definition.h"

#ifndef FIR_TWO_PI
#define FIR_TWO_PI 6.28318530717958647692
#endif

#define SIGNAL_LENGTH (N_TAPS + 20)

/**
 * Filters a sine burst with the filter defined in filter_definition.h and prints the output samples.
 */
int main(void) {
    symfir_float_t input[SIGNAL_LENGTH];
    symfir_float_t output[SIGNAL_LENGTH - N_TAPS + 1];
    const double normalized_frequency = 100.0 / SAMPLE_FREQUENCY; /* cycles per sample */
    int output_length;

    for (int n = 0; n < SIGNAL_LENGTH; ++n) {
        input[n] = (symfir_float_t)sin(FIR_TWO_PI * normalized_frequency * (double)n);
    }

    output_length = symfir_filter_signal(taps, N_TAPS, input, output, SIGNAL_LENGTH);
    if (output_length < 0) {
        fprintf(stderr, "symfir_filter_signal failed\n");
        return 1;
    }

    for (int n = 0; n < output_length; ++n) {
        printf("output[%d] = %.6f\n", n, (double)output[n]);
    }
    return 0;
}
