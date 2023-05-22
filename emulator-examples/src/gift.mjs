import { promises as fs } from "fs";
import { NetworkEmulator, Program, Address, Tx, ConstrData, NetworkParams, Value, TxOutput, Datum, IntData} from "@hyperionbt/helios";

async function main() {

    try {
        const network = new NetworkEmulator();
        // Set Network Parameters
        const networkParamsFile = await fs.readFile('./src/preprod.json', 'utf8');
        const networkParams = new NetworkParams(JSON.parse(networkParamsFile.toString()));

        // Create testing wallets
        const wallet01 = network.createWallet(100000000n);
        const wallet02 = network.createWallet(100000000n);

        // Wait 10 slots for the genesis transaction to fund the wallets
        network.tick(10n);

        // Display the balances of the two wallets
        let wallet01Utxos = await wallet01.utxos;
        let wallet02Utxos = await wallet02.utxos;
        console.log("************ INITIAL WALLET BALANCES************");
        console.log("Wallet01 UTxOs:");
        for (const utxo of wallet01Utxos) {
            console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
            console.log("");
        }
        console.log("");
        console.log("Wallet02 UTxOs:");
        for (const utxo of wallet02Utxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); 
        } 

        // Read helios smart contract, update params if any then compile
        const giftContract = await fs.readFile('./src/gift.hl', 'utf8');
        const giftCompiledProgram = Program.new(giftContract).compile();

        // Get script address
        const giftScriptAddress = Address.fromValidatorHash(giftCompiledProgram.validatorHash);

        // Build the give transaction
        const give = new Tx();
        give.addInputs(wallet01Utxos);
        const giftOutput = new TxOutput(giftScriptAddress, new Value(50000000n), Datum.inline(new IntData(2n)));
        give.addOutput(giftOutput);
        await give.finalize(networkParams, wallet01.address);
        const givetxId = await network.submitTx(give);
        console.log("Transaction sucessfully submited! Transaction ID: ", givetxId.dump());
        console.log("");

        // wait for ten slots for transaction
        network.tick(10n);

        // Get Script utxos
        console.log("****************** SCRIPT UTXOS ******************");
        const giftscriptutxos = await network.getUtxos(giftScriptAddress);
        for (const utxo of giftscriptutxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); //dumps error wiithout throwing it.
        }

        console.log();

        // Build the grab transaction
        const grab = new Tx();
        // grab transactions should always have a redeemer even if we don't actually use it.
        const giftRedeemer = new ConstrData(0, []);
        grab.addInputs(giftscriptutxos, giftRedeemer);
        grab.addInputs(wallet02Utxos);
        grab.addOutput(new TxOutput(wallet02.address, new Value(50000000n)));
        grab.attachScript(giftCompiledProgram)
        await grab.finalize(networkParams, wallet02.address, wallet02Utxos);
        const grabtxId = await network.submitTx(grab);
        console.log("Transaction sucessfully submited! Transaction ID: ", grabtxId.dump());
        console.log("");

        // wait for ten slots for transaction
        network.tick(10n);



        // Display the balances of the two wallets
        wallet01Utxos = await wallet01.utxos;
        wallet02Utxos = await wallet02.utxos;
        console.log("************ FINAL WALLET BALANCES************");
        console.log("Wallet01 UTxOs:");
        for (const utxo of wallet01Utxos) {
            console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
            console.log("");
        }
        console.log("");
        console.log("Wallet02 UTxOs:");
        for (const utxo of wallet02Utxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); 
        } 

    }catch (err) {
        console.error(err);
    }
}

main()

/*
* outputs sent to scripts require a non-null datum attached
* inputs locked by a script require a redeemer to be passed along side it.
*/