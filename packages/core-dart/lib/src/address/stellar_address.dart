import 'package:meta/meta.dart';
import '../muxed/decode.dart';
import '../exceptions.dart';
import 'codes.dart';
import 'detect.dart';

@immutable
class StellarAddress {
  final AddressKind kind;
  final String raw;
  final String? baseG;
  final BigInt? muxedId;

  const StellarAddress._({
    required this.kind,
    required this.raw,
    this.baseG,
    this.muxedId,
  });

  factory StellarAddress.parse(String address) {
    if (address.isEmpty) {
      throw const StellarAddressException('Invalid address');
    }

    switch (address[0].toUpperCase()) {
      case 'G':
        return _parseStandard(address);
      case 'M':
        return _parseMuxed(address);
      case 'C':
        return _parseContract(address);
      default:
        throw const StellarAddressException('Invalid address');
    }
  }

  static StellarAddress _parseStandard(String address) {
    _expectKind(address, AddressKind.g);
    return StellarAddress._(
      kind: AddressKind.g,
      raw: address,
      baseG: address,
    );
  }

  static StellarAddress _parseMuxed(String address) {
    _expectKind(address, AddressKind.m);

    try {
      final decoded = MuxedDecoder.decodeMuxedString(address);
      return StellarAddress._(
        kind: AddressKind.m,
        raw: address,
        baseG: decoded.baseG,
        muxedId: decoded.id,
      );
    } catch (error) {
      throw StellarAddressException(
        'Invalid muxed address: ${error.toString()}',
      );
    }
  }

  static StellarAddress _parseContract(String address) {
    _expectKind(address, AddressKind.c);
    return StellarAddress._(kind: AddressKind.c, raw: address);
  }

  static void _expectKind(String address, AddressKind expectedKind) {
    if (detect(address) != expectedKind) {
      throw const StellarAddressException('Invalid address');
    }
  }

  Map<String, dynamic> toJson() => {
        'kind': kind.name,
        'raw': raw,
        if (baseG != null) 'baseG': baseG,
        if (muxedId != null) 'muxedId': muxedId.toString(),
      };

  factory StellarAddress.fromJson(Map<String, dynamic> json) {
    return StellarAddress.parse(json['raw'] as String);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StellarAddress &&
          runtimeType == other.runtimeType &&
          raw == other.raw;

  @override
  int get hashCode => raw.hashCode;

  @override
  String toString() => raw;
}
