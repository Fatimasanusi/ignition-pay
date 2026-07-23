import 'package:stellar_address_kit/stellar_address_kit.dart';

void main() {
  const gAddress = 'GA7QYNF7SOWQ3GLR2B6RS22TBGZAOR6KLYH4PA5ZAM73A3H4K2HZZSQU';

  if (validate(gAddress)) {
    final kind = detect(gAddress);
    print('Address kind: $kind');
  }

  final parsed = StellarAddress.parse(gAddress);
  print('Parsed kind: ${parsed.kind}');

  final mAddress = MuxedAddress.encode(baseG: gAddress, id: BigInt.from(12345));
  print('Muxed Address: $mAddress');

  final decoded = MuxedAddress.decode(mAddress);
  print('Decoded ID: ${decoded.id}');

  final result = extractRouting(RoutingInput(
    destination: mAddress,
    memoType: 'none',
    memoValue: null,
  ));

  print('Routing ID: ${result.id}');
  print('Routing Source: ${result.source}');

  final parsed2 = StellarAddress.parse(gAddress);
  final json = parsed2.toJson();
  print('JSON: $json');
  final restored = StellarAddress.fromJson(json);
  print('Restored: $restored');
  assert(restored == parsed2);
}
