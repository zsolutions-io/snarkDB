import {
    execute_offline,
    verify_execution,
    generate_and_save_program_keys,
    load_program_keys,
    generate_program_keys
} from '../../aleo/proof.js';


export const retrieve_query_result = async (query_id) => {
    const private_key = "APrivateKey1zkpAZAjaJJvPS7EJ7zvk5fb3QcZDCDxMSHSN5ap7ep4FAD7";

    const program_code = `program hellothere.aleo;

    record credits:
        owner as address.private;
        microcredits as u64.private;
    
    function mint:
        input r0 as u64.public;
        cast self.caller r0 into r1 as credits.record;
        output r1 as credits.record;
    
    function join:
        input r0 as u32.private;
        input r1 as u32.public;
        add r0 r1 into r2;
        output r2 as u32.private;
    `;
    const function_name = "mint";
    const function_inputs = ["11u64"];

    const prover_files_dir = `${process.cwd()}/resources/builds/hellothere`;

    let res = {};

    /*
    const [proving_key, verifying_key] = await generate_and_save_program_keys(
        program_code,
        function_name,
        function_inputs,
        private_key,
        prover_files_dir,
    );

    */

    const [proving_key, verifying_key] = await load_program_keys(
        function_name,
        prover_files_dir,
    );


    /*
    res = await execute_offline(
        program_code,   // localProgram
        function_name,         // aleoFunction
        function_inputs,      // inputs
        private_key,          // privateKey
        proving_key,  // provingKey
        verifying_key,  // verifyingKey
        true            // proveExecution
    );
    
    */

    const execution = '{"transitions":[{"id":"au10wvjrjz2ttjmd0hnp0lu3uvw6pq2v8ffeaerm3v282c37tutlvrqk8jyv7","program":"hellothere.aleo","function":"mint","inputs":[{"type":"public","id":"191993279848145286321590171281704678222922768385397379491854404065543264580field","value":"11u64"}],"outputs":[{"type":"record","id":"65114441536500016825061579707387900068380764293906929424905432743323780629field","checksum":"2033594780991662625654868206221380873809444418321917738967279607794615591017field","value":"record1qyqsq97wpjxfz8l9p2zq9yu3kg7keqhg7tu2kt4x2sldewz4tf3qywsvqyxx66trwfhkxun9v35hguerqqpqzqxxkhr3q0fefy46gdzlk3hglnx7c0zgv3zq8fdv30rft4uuf27sqwh5rwfc4a87a4qvw9j36dykqw9e3jhrw76jhadw3fan7d50aausq0ncqn7"}],"tpk":"6721081151402130690966655433876104462963328976847272257533659277118689380266group","tcm":"6604424913470127167792348687615846902464814651518550556987123315787027057701field"}],"global_state_root":"sr1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gk0xu","proof":"proof1qyqsqqqqqqqqqqqpqqqqqqqqqqqpc8yngwjr435ygc9g90w4teeutt6w5ytem55chyexdvletgj4umrspahrghuyg8n4tlcfmt4qvcqpqx5dux5a9n8pnh08juddal9nd7d52j39t4xcvhsu73ult9wgu96k5xd0n895a36zxnnnward9u6j9qyrmz9q7zj2q8efntmx66fytnsrlsnav8avpev8n8kru62hhdc9sjnylck3em4d4av46exu3k0p4qq2ecumzcyysn9spnhhah9xmzkk4d3rctqnm54672wy792h3n72qs2fgghphnz38hk6k88tvt8shjvq9fjyqqytegdf5xvqxvm84t02dlp86pgs4ayy35v2eurwya98dps5avtnswqjsl2aqcefmr8fhwpcp58rr4g9m4u7582udqz77cxuz8g2qsvdf3ctc7pykmss375ft83a0w2yqy39lwp5fm28su6x5n4eszl5l8vtuuc4h8apjg4uwd9a0xjcd6lncmqa8nrmswscp8sqtfe866s8lgmnrxhjxcwp9lurxga0mq9jqejfchs2tyurmdqjn7udzrht8heslsatptmz5kxt5tw2eafk824zn7yjlg75n0ydc4zpkynlg6qwyfxjqu580pvfz328vvqkp78cpkg9dlc59gn8xjms6azvzm44kj9tnjuv82kse9lc29j7v9nqw25qgux0psfhll2u97cxhmzwvj6qafqkp23u29rk3j3d95hrqq3q6yzqsgm5me97us97anac3e56q6zwfjtp3rs5q8h2f64strn98nktyrg0jk2qcvn0hu5wva8ncmawlvzk2wys0nvrn0ucnthqh3ah37l4p97ys7tw300g3gvt6pt953j7f3n2qnyf0rk3ly4j9l35mq4uhssqjacxfcsr60uzaap24uwet7fz5gl268rc5dhapd7f3p8cd76rx3gvhdzp9tkkuqwv6fzjvwy9l6qpl7x4kurkjw6f4m3ynh7t0v9vzcfv58mgxurhuxwq7elmadc4h7g0uslkmafcxcexva7rq3a4kscxsp7gcl25eestfp3z9hh62e0ryr502fnu8mn8jy5qmt566rt0xlfrqdk52wfzeq3u8aa9nk55ajj6m47pvv3mwjkfn6w3wm0xdjan56dsuvkk392p9q58axh7l0ktjked4lzzlu4hltv8anjyx96fam7xy0srqvqqqqqqqqqqp6x68q8wywl3aym6jj4cdykkq4dcd3f56x4za7wj3nn8artv3m4xctap936ty70mtrw0l5p2gat3sqqwzlfh9wnxhnp2ycsu46sz7vwf3qprt776fd7kadg5vrtxluk5d9r4sel6fsur5654w8kq75vmld5qqxf823fhg0h9esa4cxhu3fqxx47wyevuxa98k87txajxpsa9x2qsuka57n9pquyhh7s0qjs5crm4yc63yuqlw072xhdc77cjdjdfz8gscagpmjv5stedv6w9qpq25d2rsyqqu9dsuf"}';

    res = await verify_execution(
        execution,
        verifying_key,
        program_code,
        function_name,
    );


    console.log({ res })

    return;

};