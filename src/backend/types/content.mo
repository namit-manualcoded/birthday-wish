import Common "common";

module {
  public type MessageId = Common.MessageId;
  public type PhotoId = Common.PhotoId;
  public type Timestamp = Common.Timestamp;
  public type StoredFile = Common.StoredFile;

  /// Saved crop/adjust parameters for a photo, applied by the frontend when
  /// rendering. Values are normalized so they are independent of the rendered
  /// size: `zoom` is a scale factor (1.0 = fit), `offsetX`/`offsetY` are
  /// fractions of the photo's rendered width/height, and `rotation` is degrees.
  public type CropAdjust = {
    zoom : Float;
    offsetX : Float;
    offsetY : Float;
    rotation : Float;
  };

  /// A single animated text message paired with a photo.
  public type Message = {
    id : MessageId;
    text : Text;
    photo : ?StoredFile;
    crop : ?CropAdjust;
    position : Nat;
  };

  /// The hero section: greeting headline, subtext, and her photo.
  public type Greeting = {
    headline : Text;
    subtext : Text;
    heroPhoto : ?StoredFile;
    heroCrop : ?CropAdjust;
  };

  /// Which source currently supplies the background song.
  /// `#url` — an owner-set external audio URL (takes precedence).
  /// `#upload` — an owner-uploaded file stored via object storage.
  /// `#default` — neither is set; the frontend plays its bundled default.
  public type SongSourceKind = {
    #url;
    #upload;
    #default;
  };

  /// The active background song source, exposed to the frontend.
  public type SongSource = {
    kind : SongSourceKind;
    url : ?Text;
    file : ?StoredFile;
  };

  /// The full editable site content returned to the public experience.
  public type SiteContent = {
    greeting : Greeting;
    messages : [Message];
    song : ?StoredFile;
    songSource : SongSource;
  };

  /// Input for creating or updating a message entry.
  public type MessageInput = {
    text : Text;
    photo : ?StoredFile;
    crop : ?CropAdjust;
    position : Nat;
  };

  /// Input for updating the greeting headline and subtext.
  public type GreetingInput = {
    headline : Text;
    subtext : Text;
  };
};
