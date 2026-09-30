import { describe, it, expect } from 'vitest'

import { Filter, FilterBandSpec } from '../models/FilterSpec'

describe('Filter.updateError', () => {
  it('returns zeros for a band without points in the frequency response', () => {
    const filter = new Filter();
    const band = new FilterBandSpec();
    band.freqBegin = 900; // above all frequencies of the frequency response
    band.freqEnd = 1000;
    band.desiredBegin = 0;
    band.desiredEnd = 0;
    band.weight = 1;
    filter.bands = [band];
    filter.fr = [0, 100, 200, 300, 400];
    filter.hm = [1, 1, 1, 1, 1];

    filter.updateError();

    expect(filter.errorPerBand.length).toBe(1);
    const error = filter.errorPerBand[0]!;
    expect(error.noPoints).toBe(0);
    expect(error.maxError).toBe(0);
    expect(error.minError).toBe(0);
    expect(error.errorIntegral).toBe(0);
    expect(error.maxRelError).toBe(0);
    expect(error.minRelError).toBe(0);
  })
})
