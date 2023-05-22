import { promises as fs } from "fs";
import { NetworkEmulator, Program, Address, Tx, config, NetworkParams, Value, TxOutput, Datum, IntData, ListData, ByteArrayData} from "@hyperionbt/helios";

async function main() {

    try {
        config.AUTO_SET_VALIDITY_RANGE = true;
        const network = new NetworkEmulator();
        // Set Network Parameters
        const networkParamsFile = await fs.readFile('./src/preprod.json', 'utf8');
        const networkParams = network.initNetworkParams(new NetworkParams(JSON.parse(networkParamsFile.toString())));

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
        const vestingContract = await fs.readFile('./src/vesting.hl', 'utf8');
        const vestingProgram = Program.new(vestingContract);
        

        const vestingCompiledProgram = vestingProgram.compile();
        
        const datum = new vestingProgram.types.Datum(wallet01.pubKeyHash, wallet02.pubKeyHash, 0)
        const claimRedeemer = vestingProgram.evalParam("claim_action").data;



        // Get script address
        const vestingScriptAddress = Address.fromValidatorHash(vestingCompiledProgram.validatorHash);

        // Build the give transaction
        const give = new Tx();
        give.addInputs(wallet01Utxos);
        const vestingOutput = new TxOutput(vestingScriptAddress, new Value(50000000n), Datum.inline(datum));
        give.addOutput(vestingOutput);
        await give.finalize(networkParams, wallet01.address);
        const givetxId = await network.submitTx(give);
        console.log("Transaction sucessfully submited! Transaction ID: ", givetxId.dump());
        console.log("");

        // wait for ten slots for transaction
        network.tick(10n);

        // Get Script utxos
        console.log("****************** SCRIPT UTXOS ******************");
        const vestingscriptutxos = await network.getUtxos(vestingScriptAddress);
        for (const utxo of vestingscriptutxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); //dumps error wiithout throwing it.
        }


        // Build the grab transaction
        const grab = new Tx();
        // grab transactions should always have a redeemer even if we don't actually use it.
        
        grab.addInput(vestingscriptutxos[0], claimRedeemer);
        grab.addOutput(new TxOutput(wallet02.address, new Value(50000000n)));
        grab.attachScript(vestingCompiledProgram)
        grab.addSigner(wallet02.pubKeyHash)
        await grab.finalize(networkParams, wallet02.address, wallet02Utxos);
        grab.addSignatures(await wallet02.signTx(grab));
        console.log("Transaction sucessfully submited! Transaction ID: ")
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