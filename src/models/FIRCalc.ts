import FIRModule from '@/assets/fir.js';
import { FilterBandSpec, filterSpec, NO_POINTS } from '@/models/FilterSpec';
import { Stopwatch } from '@/helpers/Stopwatch';
import { addLog } from '@/helpers/Logger';

type Observer = (() => void);

const MAXTAPS = 1001;

// Copied/adapted from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/emscripten/index.d.ts
interface EmscriptenModule {
    print(str: string): void;
    printErr(str: string): void;
    arguments: string[];
    preInit: Array<{ (): void }>;
    preRun: Array<{ (): void }>;
    postRun: Array<{ (): void }>;
    onAbort: { (what: any): void };
    onRuntimeInitialized: { (): void };
    preinitializedWebGLContext: WebGLRenderingContext;
    noInitialRun: boolean;
    noExitRuntime: boolean;
    logReadFiles: boolean;
    filePackagePrefixURL: string;
    wasmBinary: ArrayBuffer;

    destroy(object: object): void;
    getPreloadedPackage(remotePackageName: string, remotePackageSize: number): ArrayBuffer;
    locateFile(url: string, scriptDirectory: string): string;
    onCustomMessage(event: MessageEvent): void;

    // USE_TYPED_ARRAYS == 2
    HEAP8: Int8Array;
    HEAP16: Int16Array;
    HEAP32: Int32Array;
    HEAPU8: Uint8Array;
    HEAPU16: Uint16Array;
    HEAPU32: Uint32Array;
    HEAPF32: Float32Array;
    HEAPF64: Float64Array;

    TOTAL_STACK: number;
    TOTAL_MEMORY: number;
    FAST_MEMORY: number;

    addOnPreRun(cb: () => any): void;
    addOnInit(cb: () => any): void;
    addOnPreMain(cb: () => any): void;
    addOnExit(cb: () => any): void;
    addOnPostRun(cb: () => any): void;

    _malloc(size: number): number;
    _free(ptr: number): void;

    cwrap(name: string, retType: string, paramTypes: string[]): any;
}

class State {
    instance: EmscriptenModule | null = null;
    fir_firerror: any;
    fir_firls: any;
    fir_freqz: any;

    // get VERSION(): string { return this.module.VERSION; }

    startLoad: number = Date.now();
    observersInitialized: Observer[] = [];

    isInitalized() { return this.instance != null; }

    /** Register an observer which is called when FIRModule is initialized. If FIRModule is already initialized, the observer is called immediately. */
    addObserverInitialized(observer: Observer): void {
        if (this.instance == null)
            this.observersInitialized.push(observer);
        else
            observer();
    }

    /** Calculate FIR filter and update global state with the parameters/results */
    updateFilter(numTaps: number, frequencyBands: number[], desiredBegin: number[], desiredEnd: number[], weights: number[], sampleFrequency: number): [boolean, string | number[]] {
        filterSpec.sampleFrequency = sampleFrequency;

        let s = new Stopwatch();
        const [success, result] = this.firls(numTaps, frequencyBands, desiredBegin, desiredEnd, weights, sampleFrequency);
        let elapsedMs = s.elapsedMs();
        addLog(`firls calculation took ${elapsedMs} ms`);

        if (success) {
            filterSpec.sampleFrequency = sampleFrequency;
            filterSpec.bands = [];
            for (let i = 0; i < desiredBegin.length; i++) {
                const band = new FilterBandSpec();
                band.freqBegin = frequencyBands[2 * i];
                band.freqEnd = frequencyBands[2 * i + 1]
                band.desiredBegin = desiredBegin[i];
                band.desiredEnd = desiredEnd[i];
                band.weight = weights[i];
                filterSpec.bands.push(band);
            }
            filterSpec.taps = result as number[];

            s = new Stopwatch();
            const [fr, hm] = this.freqz(NO_POINTS, filterSpec.taps, filterSpec.sampleFrequency);
            elapsedMs = s.elapsedMs();
            addLog(`frequency response calculation took ${elapsedMs} ms`);

            filterSpec.fr = Array.from(fr);
            filterSpec.hm = Array.from(hm);
        } else {
            filterSpec.sampleFrequency = 0;
            filterSpec.bands = [];
            filterSpec.taps = [];
            filterSpec.fr = [];
            filterSpec.hm = [];
        }
        filterSpec.updateError();

        return [success, result];
    }

    firls(numTaps: number, frequencyBands: number[], desiredBegin: number[], desiredEnd: number[], weights: number[], sampleFrequency: number): [boolean, string | number[]] {
        if (this.instance == null) return [false, "FIR calculation engine (WebAssembly) not initialized"];
        if (numTaps < 1 || numTaps > MAXTAPS) {
            return [false, `Number of taps out of range 1..${MAXTAPS}`]
        }

        const noBands = desiredBegin.length;
        if (frequencyBands.length != 2 * noBands || desiredEnd.length != noBands || weights.length != noBands) {
            return [false, "Mismatch between no of frequencies/weights/amplitudes!"];
        }

        // Pass all data to Emscripten heap
        const bandsPtr = this.createEmscriptenArrayDoubles(frequencyBands);
        const desiredBeginPtr = this.createEmscriptenArrayDoubles(desiredBegin);
        const desiredEndPtr = this.createEmscriptenArrayDoubles(desiredEnd);
        const weightPtr = this.createEmscriptenArrayDoubles(weights);

        const tapsPtr = this.reserveEmscriptenArrayDoubles(numTaps);

        const ret = this.fir_firls(tapsPtr, numTaps, frequencyBands.length / 2, bandsPtr, desiredBeginPtr, desiredEndPtr, weightPtr, sampleFrequency);
        const taps = this.getEmscriptenArrayDoubles(tapsPtr, numTaps);

        this.instance._free(tapsPtr);
        this.instance._free(weightPtr);
        this.instance._free(desiredEndPtr);
        this.instance._free(desiredBeginPtr);
        this.instance._free(bandsPtr);
        if (ret != 0) {
            const message = this.fir_firerror(ret);
            return [false, message];
        } else {
            return [true, Array.from(taps)];
        }
    }

    freqz(n: number, taps: number[], sampleFrequency: number): [Float64Array, Float64Array] {
        if (this.instance == null) return [new Float64Array(), new Float64Array()];

        // Pass all data to Emscripten heap and reserve memory for results
        const tapsPtr = this.createEmscriptenArrayDoubles(taps);
        const frequenciesPtr = this.reserveEmscriptenArrayDoubles(n);
        const magnitudesPtr = this.reserveEmscriptenArrayDoubles(n);

        // Call function and get result
        const ret = this.fir_freqz(frequenciesPtr, magnitudesPtr, n, taps.length, tapsPtr, sampleFrequency);
        if (ret != 0) return [new Float64Array, new Float64Array];

        const frequencies = this.getEmscriptenArrayDoubles(frequenciesPtr, n);
        const magnitudes = this.getEmscriptenArrayDoubles(magnitudesPtr, n);

        // Free memory
        this.instance._free(tapsPtr);
        this.instance._free(frequenciesPtr);
        this.instance._free(magnitudesPtr);

        return [frequencies, magnitudes];
    }

    /**
     * Allocate an array of values on the EmScripten heap and return a pointer
     * @param {*} data    Array containing numbers
     * @returns pointer in Emscripten heap containing the array. This must be freed after use with instance._free(ptr)
     */
    private createEmscriptenArrayDoubles(data: number[]): number {
        if (this.instance == null) return 0;

        const data_float64 = new Float64Array(data);
        const nDataBytes = data_float64.length * data_float64.BYTES_PER_ELEMENT;
        const dataPtr = this.instance._malloc(nDataBytes);

        // Copy data to Emscripten heap (directly accessed from instance.HEAPU8)
        const dataHeap = new Uint8Array(this.instance.HEAPU8.buffer, dataPtr, nDataBytes);
        dataHeap.set(new Uint8Array(data_float64.buffer));
        return dataPtr;
    }

    /**
     * Reserve room for an array of doubles on the EmScripten heap and return a pointer
     * @param {number} length  No of doubles
     * @returns pointer in Emscripten heap containing the array. This must be freed after use with instance._free(ptr)
     */
    private reserveEmscriptenArrayDoubles(length: number): number {
        if (this.instance == null) return 0;

        const nDataBytes = length * Float64Array.BYTES_PER_ELEMENT;
        const dataPtr = this.instance._malloc(nDataBytes);
        return dataPtr;
    }

    /**
     * Copy an array of doubles from the Emscripten heap to a newly created JavaScript Float64Array
     * @param {number} dataPtr  Pointer in emscripten heap to the input array
     * @param {number} length  No of elements in the input array
     * @returns  Array containing the data
     */
    private getEmscriptenArrayDoubles(dataPtr: number, length: number): Float64Array {
        if (this.instance == null) return new Float64Array();

        // The inner Float64Array is a view on the heap. Copy this to a separate Float64array, not referencing the heap.
        return new Float64Array(new Float64Array(this.instance.HEAPU8.buffer, dataPtr, length));
    }
}

const firCalc = (function () {
    const state = new State();

    FIRModule().then((instance: EmscriptenModule) => {
        state.instance = instance;
        state.fir_firerror = instance.cwrap(
            'firerror', // name
            'string', // return value
            ['number'] // arguments
        );
        // extern "C" int firls(FirFloat result[], int numTaps, int numBands, const FirFloat bands[], const FirFloat desiredBegin[], const FirFloat desiredEnd[], const FirFloat weight[], FirFloat fs);
        state.fir_firls = instance.cwrap(
            'firls', // name
            'number', // return value
            ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'] // arguments
        );
        state.fir_freqz = instance.cwrap(
            'firfreqz', // name
            'number', // return value
            ['number', 'number', 'number', 'number', 'number', 'number'] // arguments
        );

        addLog(`firCalc is initialized, WebAssembly init took ${Date.now() - state.startLoad} ms.`);
        state.observersInitialized.forEach(observer => { observer(); });
    });
    return state;
})();

export default firCalc;
