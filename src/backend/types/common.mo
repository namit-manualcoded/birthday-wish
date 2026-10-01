import Storage "mo:caffeineai-object-storage/Storage";

module {
  /// Identifier for a message entry, assigned by the backend.
  public type MessageId = Nat;

  /// Identifier for a photo slot (hero or a message's paired photo).
  public type PhotoId = Nat;

  /// Nanoseconds since the Unix epoch, as returned by `Time.now()`.
  public type Timestamp = Int;

  /// A reference to a file stored via platform object storage.
  /// `Storage.ExternalBlob` is the platform's off-chain file handle; the
  /// frontend uploads the bytes and this canister stores only the reference.
  public type StoredFile = Storage.ExternalBlob;
};
