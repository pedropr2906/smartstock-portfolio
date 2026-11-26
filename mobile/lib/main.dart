import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:webview_flutter/webview_flutter.dart';

const title = String.fromEnvironment('APP_NAME', defaultValue: 'SmartStock');
const source = String.fromEnvironment('APP_URL');
void main() => runApp(MaterialApp(title: title, home: source.isEmpty ? const PilotAddress() : const StockScreen(address: source)));

class PilotAddress extends StatefulWidget {
  const PilotAddress({super.key});
  @override
  State<PilotAddress> createState() => PilotAddressState();
}
class PilotAddressState extends State<PilotAddress> {
  String value = '';
  String? error;
  @override
  Widget build(BuildContext context) => Scaffold(appBar:AppBar(title:const Text(title)),
    body:SafeArea(child:ListView(padding:const EdgeInsets.all(20),children:[
      TextField(keyboardType:TextInputType.url,autocorrect:false,
        decoration:InputDecoration(labelText:'Endereço HTTPS do piloto',errorText:error),
        onChanged:(v)=>value=v.trim()),
      ElevatedButton(child:const Text('Abrir piloto'),onPressed:(){
        final uri=Uri.tryParse(value);
        if(uri==null || uri.scheme!='https' || uri.host.isEmpty || uri.userInfo.isNotEmpty || uri.hasQuery || uri.hasFragment){
          setState(()=>error='Informe o endereço HTTPS da sua instalação.');return;
        }
        Navigator.push(context,MaterialPageRoute(builder:(_)=>StockScreen(address:uri.toString())));
      }),
    ])));
}

class StockScreen extends StatefulWidget {
  final String address;
  const StockScreen({super.key, required this.address});
  @override
  State<StockScreen> createState() => StockState();
}

class StockState extends State<StockScreen> {
  late final WebViewController web;
  late final home = Uri.tryParse(widget.address);
  bool failed = false;
  bool get valid => home != null && home!.scheme == 'https' && home!.host.isNotEmpty && home!.userInfo.isEmpty;
  bool allowed(String url) {
    final uri = Uri.tryParse(url);
    return valid && uri != null && uri.scheme == 'https' &&
        uri.host == home!.host && uri.port == home!.port && uri.userInfo.isEmpty &&
        uri.path.startsWith(home!.resolve('.').path);
  }
  @override
  void initState() {
    super.initState();
    if (!valid) return;
    web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onHttpAuthRequest: (request) async {
          if (!mounted || request.host != home!.host) { request.onCancel(); return; }
          String user = '', password = '';
          final accept = await showDialog<bool>(context:context,builder:(dialog)=>AlertDialog(
            title:const Text('Acesso ao estoque'),
            content:Column(mainAxisSize:MainAxisSize.min,children:[
              TextField(decoration:const InputDecoration(labelText:'Usuário'),onChanged:(v)=>user=v),
              TextField(decoration:const InputDecoration(labelText:'Senha'),obscureText:true,onChanged:(v)=>password=v),
            ]),
            actions:[
              TextButton(onPressed:()=>Navigator.pop(dialog,false),child:const Text('Cancelar')),
              TextButton(onPressed:()=>Navigator.pop(dialog,true),child:const Text('Entrar')),
            ],
          ));
          if (accept == true) { request.onProceed(WebViewCredential(user:user,password:password)); }
          else { request.onCancel(); }
        },
        onNavigationRequest: (r) => allowed(r.url) ? NavigationDecision.navigate : NavigationDecision.prevent,
        onWebResourceError: (e) { if (mounted && e.isForMainFrame == true) setState(() => failed = true); },
      ))
      ..loadRequest(home!);
  }
  Future<void> scan() async {
    final value = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const ScanPage()));
    if (!mounted || value == null || !allowed(await web.currentUrl() ?? '')) return;
    final result = await web.runJavaScriptReturningResult('''
      (() => {
        const input = [...document.querySelectorAll('#busca,#eqSearch,#logSearch,#ssDeliverySearch,#reverseSearch')]
          .find(e => e.getClientRects().length && !e.disabled);
        if (!input) return false;
        input.value = ${jsonEncode(value)};
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.scrollIntoView({block:'center'});
        return true;
      })()
    ''');
    if (mounted && result.toString() != 'true') {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Abra a consulta de estoque para pesquisar pelo código.')));
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text(title), actions: [
      if (valid && !failed) IconButton(tooltip:'Pesquisar por código', icon:const Icon(Icons.qr_code_scanner), onPressed:scan),
      if (valid) IconButton(tooltip:'Atualizar',icon:const Icon(Icons.refresh),onPressed:(){setState(()=>failed=false);web.loadRequest(home!);}),
    ]),
    body: SafeArea(child: !valid ? const Center(child:Text('Endereço da instalação não configurado.'))
      : failed ? const Center(child:Text('Serviço indisponível. Confira a conexão e toque em atualizar.'))
      : WebViewWidget(controller:web)),
  );
}

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});
  @override
  State<ScanPage> createState() => ScanState();
}
class ScanState extends State<ScanPage> {
  bool complete = false;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar:AppBar(title:const Text('Ler código do material')),
    body:MobileScanner(onDetect:(capture){
      for (final barcode in capture.barcodes) {
        final value=barcode.rawValue;
        if (!complete && value != null && value.isNotEmpty && value.length <= 256) {
          complete=true;
          Navigator.pop(context,value);
          return;
        }
      }
    }),
  );
}
