import { threads } from "wasm-feature-detect";
import * as Comlink from "comlink";

async function fetch_params() {
  // const response = await import("./pkg/params.bin");
  const response = await fetch("http://localhost:3002/params.bin");
  const bytes = await response.arrayBuffer();
  const params = new Uint8Array(bytes);
  return params;
}

// Wrap wasm-bindgen exports (the `generate` function) to add time measurement.
function wrapExports({ generate }) {
  return ({ width, height, maxIterations }) => {
    const start = performance.now();
    const rawImageData = generate(width, height, maxIterations);
    const time = performance.now() - start;
    return {
      // Little perf boost to transfer data to the main thread w/o copying.
      rawImageData: Comlink.transfer(rawImageData, [rawImageData.buffer]),
      time,
    };
  };
}

// The name of the exported function is the argument
function wrapSumSquares({ sum_of_squares }) {
  return () => {
    const start = performance.now();
    const res = sum_of_squares([1, 2]);
    const time = performance.now() - start;
    return {
      // Little perf boost to transfer data to the main thread w/o copying.
      res,
      time,
    };
  };
}

function wrapConsoleLog({ test_console_log }) {
  return () => {
    const start = performance.now();
    const res = test_console_log();
    console.log("res", res);
    const time = performance.now() - start;
    return {
      // Little perf boost to transfer data to the main thread w/o copying.
      res,
      time,
    };
  };
}

// The name of the exported function is the argument
function wrapProofGen({ generate_proof }) {
  return async () => {
    const start = performance.now();
    const params = await fetch_params();
    console.log("params", params);
    console.log(params.length);
    const res = generate_proof(params);
    console.log(res);
    const time = performance.now() - start;
    return {
      // Little perf boost to transfer data to the main thread w/o copying.
      res,
      time,
    };
  };
}

// The name of the exported function is the argument
function wrapVerifyProof({ verifyProof }) {
  return ({ proofBytes }) => {
    const start = performance.now();
    const proofBytesParsed = proofBytes.split(",").map((a) => parseInt(a));
    console.log(proofBytesParsed);
    if (Math.random() < 0.5) {
      console.log("Messing up proof!");
      proofBytesParsed[1] += 1;
    }
    const res = verifyProof(proofBytesParsed);
    console.log(res);
    const time = performance.now() - start;
    return {
      // Little perf boost to transfer data to the main thread w/o copying.
      res,
      time,
    };
  };
}

async function initHandlers() {
  let [singleThread, multiThread, sumSquaresArray, [proofGen, verifyProof]] =
    await Promise.all([
      (async () => {
        return;
        // console.log("Loading pkg");
        // const singleThread = await import("./pkg/wasm_bindgen_rayon_demo.js");
        // await singleThread.default();
        // console.log("Done loading pkg");
        // return wrapExports(singleThread);
      })(),
      (async () => {
        return;
        // If threads are unsupported in this browser, skip this handler.
        // if (!(await threads())) return;
        // console.log("Loading pkg-parallel");
        // const multiThread = await import(
        //   "./pkg-parallel/wasm_bindgen_rayon_demo.js"
        // );
        // await multiThread.default();
        // await multiThread.initThreadPool(navigator.hardwareConcurrency);
        // console.log("Done loading multiThread");
        // return wrapExports(multiThread);
      })(),
      (async () => {
        // If threads are unsupported in this browser, skip this handler.
        if (!(await threads())) return;
        console.log("Loading console log");
        const sumSquaresArray = await import("./pkg/halo2_pairing.js");
        await sumSquaresArray.default();
        await sumSquaresArray.init_panic_hook();
        // await sumSquaresArray.initThreadPool(navigator.hardwareConcurrency);
        console.log("Done loading wrapped sum squares");
        return wrapConsoleLog(sumSquaresArray);
      })(),
      (async () => {
        // If threads are unsupported in this browser, skip this handler.
        console.log("Loading");
        if (!(await threads())) return;
        console.log("Loading proof gen");
        const halo2_examples = await import("./pkg/halo2_pairing.js");
        await halo2_examples.default();
        await halo2_examples.init_panic_hook();
        await halo2_examples.initThreadPool(navigator.hardwareConcurrency);
        console.log("Done loading wrap proof gen");
        return [wrapProofGen(halo2_examples), wrapVerifyProof(halo2_examples)];
      })(),
      // (async () => {
      //   // If threads are unsupported in this browser, skip this handler.
      //   if (!(await threads())) return;
      //   console.log("Loading verify proof");
      //   const halo2_examples = await import(
      //     './halo-pkg/halo2_examples.js'
      //   );
      //   // await halo2_examples.default();
      //   await halo2_examples.initThreadPool(navigator.hardwareConcurrency);
      //   console.log("Done loading wrap verify proof");
      //   return wrapVerifyProof(halo2_examples);
      // })()
    ]);

  return Comlink.proxy({
    singleThread,
    supportsThreads: !!multiThread,
    multiThread,
    sumSquaresArray,
    proofGen,
    verifyProof,
  });
}

Comlink.expose({
  handlers: initHandlers(),
});
