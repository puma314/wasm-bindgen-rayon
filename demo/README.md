This is the source for the demo at https://rreverser.com/wasm-bindgen-rayon-demo/.

<img src="https://user-images.githubusercontent.com/557590/113038444-7177eb00-918e-11eb-855b-300a582696e9.gif" width="500" />

npm run build
npx serve -c ../serve.json dist/
npx serve -c ../serve.json dist/ -p 3002

cd demo/
rm -rf pkg/
cp -r ../../halo2-ecc/pkg/ pkg/

npm run build:webpack
npm run serve

rm -rf pkg/ && cp -r ../../halo2-ecc/pkg/ pkg/
