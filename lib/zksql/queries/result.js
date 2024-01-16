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
    const execution = '{ "transitions": [{ "id":"au14dlggv4de0r4sk2m2mg2h6dwde5xamymjrwnpeejd9gedkpegufq2xst2n", "program":"hellothere.aleo", "function":"mint", "inputs": [{ "type":"public", "id":"7543687560583432382007782293993611624468703496280111705073687080188171148011field", "value":"11u64"}], "outputs": [{ "type":"record", "id":"4345124261267508570377580577888185627731968298412387361170501531007820304978field", "checksum":"8087004771998033697400974698637132032888061799720047025066127196134375023723field", "value":"record1qyqspcaucn6srs59dv0va6qhwap2lcl594n9tmkxrk3tmufzv9347vqxqyxx66trwfhkxun9v35hguerqqpqzq9gs3gnef68scy7kpxh8rwr8putndu36e0uvk78f2z94mzdh2ydpzqy5d93zxt4pl9nmjsvhvuka80fyexgf79mhyug2nkqs3dz93tscrqhkek"}], "tpk":"1364154831755777830796009315039862401587741980056769814673633719151105753633group", "tcm":"94994434392823917933382632975928164506984753778031124514069279446747346094field"}], "global_state_root":"sr1wlptstv6lymlg3lejxmjv0jzpylq5hsgt3u8tfee9vuqpstg6s8stu72e3", "proof":"proof1qyqsqqqqqqqqqqqpqqqqqqqqqqqqhv4mpq9yafc7kx3kfe7w473lfljd7sy99avsclv4e5qzqd0z3em87j3kcvdmsk597fe45ef96tupqx9j0hg7uk2uc5m7936ljj567m383znxv9wxt9qt5eykzkenewvgkz8uhuh84uxd0tptmznwhj97mq8r9rw8d2vna72ft5c8uuwdnqn6e2dj8jyns04s3e6me2c45ewm9cyzrus2ncfmqsdnv956wvyvj7qenkzkmgmck9hdsd9edk4g56wtwuhqjh3grhmmauelxrmghn0074736ndnvcrn0yd4ck5v65r6dzup899jjmkfv0kapk27qjsxvumjxhtnu4n4z2c4lem84gr4ah0wrm97p7pman4nzckg7hrajfxjfzpcptpx9ws0gmcxelnaqrgfdt4z7uat99uekqkndrr5dpd7elkzeck79ke67wqnmmthmgyn5d8rhz2wsqgqqgpvd788jph6vj9j0w2qxfp2tkkkxt7taqu3mqg049qwfv4vdnrnwutr3eua5xlmfqnjll0c0qdwxkvqt6agfue8kpgdllz76w9dvdxftx74g5agj9flvvygjc5v9tu958lphy95g8aalpg7qqr95wqah7ua3asq3jpfthyllp0pxu7gg25q9dk7a0f3rx6k3dqwk6py9tzkl6vmkljp6gpjlecwm2my89up5qspqsens0xm3c3fpffh7z57yna49ukh3jtnsj0t6v3xqgxa2gzplgtp5xfke4wwq583zgud4j4j3lqjlnfgyw4qe0ajmky4fsj02pg3za6p6nfmglaetwxsdamgjegas95egm6q326r0sw3kgly7kjnpt6dm9xh5prkuc59kh4fs5832tk8saydhprryrd75g0a6vqnqyl3p2578u2n3tvjz5dpt5t455fdw0h4y0p4pnpllk3ffgaydrfsx4q80fuymmudz3y940fhf8ln3wq5vw4r6ge07nv2k3tst5nz7qrckcq3jlxyc3fzs2za5dtcjnnmkas4ylm6qdxqakdvx6fsm4x34k7ngznjwm4x7htf9gvwv88g3dc7hfjpwf9hdzje8pa024zt2ck0y7jap49wveeaursjvfewl7t4d9h0kufu7zxmdvfqsfekt3eh7qmlpwms74wwx932adesumw2tfdgv4lrcfqxdz2xjhnjryzhmptxcr7h9xgxqvqqqqqqqqqqqwadjcdgcrd8785zzc776s6lqwhl854yu6pm8mq00kp8ulgqqhrcpkghsj5u7pdfvp9k7e6zd6qhqyqd46t78yt4ln4a52l33p2gqu0l9legjfgaje9mvtw8qa8x63ncdu7zug04lj05uh0p5ak2kt8pe2cqq9rauh4yrjw9j824sx0f00wpmxzc756uj7g4pl0pxt8y5g73sp7sqrx5ppgpapxaavfljyys9argvqv5ggf72nelv43707pm3qua8rpuyjfssq77yfkz8rdnyjl0p79wsqqqt5n0vm"}';
    res = await verify_execution(
        execution,
        verifying_key,
        program_code,
        function_name,
    );

    console.log({ res })


    return;

};