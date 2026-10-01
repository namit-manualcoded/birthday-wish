import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";

module {
  // Inlined old and new types (migrations must be self-contained).
  type MessageId = Nat;
  // Platform object-storage file reference (`Storage.ExternalBlob` is `Blob`).
  type StoredFile = Blob;

  // Old shapes, as produced by the preceding migration in the chain.
  type OldMessage = {
    id : MessageId;
    text : Text;
    photo : ?StoredFile;
    position : Nat;
  };
  type OldGreeting = {
    headline : Text;
    subtext : Text;
    heroPhoto : ?StoredFile;
  };

  // New shapes, adding saved crop/adjust parameters.
  type CropAdjust = {
    zoom : Float;
    offsetX : Float;
    offsetY : Float;
    rotation : Float;
  };
  type Message = {
    id : MessageId;
    text : Text;
    photo : ?StoredFile;
    crop : ?CropAdjust;
    position : Nat;
  };
  type Greeting = {
    headline : Text;
    subtext : Text;
    heroPhoto : ?StoredFile;
    heroCrop : ?CropAdjust;
  };

  public type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    greeting : { var value : OldGreeting };
    messages : Map.Map<MessageId, OldMessage>;
    song : { var value : ?StoredFile };
    nextMessageId : { var value : Nat };
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    greeting : { var value : Greeting };
    messages : Map.Map<MessageId, Message>;
    song : { var value : ?StoredFile };
    songUrl : { var value : ?Text };
    nextMessageId : { var value : Nat };
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      greeting = {
        var value = {
          headline = old.greeting.value.headline;
          subtext = old.greeting.value.subtext;
          heroPhoto = old.greeting.value.heroPhoto;
          heroCrop = null;
        };
      };
      messages = old.messages.map(
        func(_, message) = {
          id = message.id;
          text = message.text;
          photo = message.photo;
          crop = null;
          position = message.position;
        }
      );
      song = old.song;
      songUrl = { var value = null };
      nextMessageId = old.nextMessageId;
    };
  };
};
