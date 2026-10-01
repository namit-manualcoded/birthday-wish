import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";

module {
  // Inlined new types (migrations must be self-contained).
  type MessageId = Nat;
  // Platform object-storage file reference (`Storage.ExternalBlob` is `Blob`).
  type StoredFile = Blob;
  type Message = {
    id : MessageId;
    text : Text;
    photo : ?StoredFile;
    position : Nat;
  };
  type Greeting = {
    headline : Text;
    subtext : Text;
    heroPhoto : ?StoredFile;
  };

  public type OldActor = {};
  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    greeting : { var value : Greeting };
    messages : Map.Map<MessageId, Message>;
    song : { var value : ?StoredFile };
    nextMessageId : { var value : Nat };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      greeting = { var value = { headline = ""; subtext = ""; heroPhoto = null } };
      messages = Map.empty();
      song = { var value = null };
      nextMessageId = { var value = 0 };
    };
  };
};
