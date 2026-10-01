import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/content";
import ContentLib "../lib/content";

mixin (
  accessControlState : AccessControl.AccessControlState,
  greeting : { var value : Types.Greeting },
  messages : Map.Map<Types.MessageId, Types.Message>,
  song : { var value : ?Types.StoredFile },
  songUrl : { var value : ?Text },
  nextMessageId : { var value : Nat },
) {
  /// Public read of all site content.
  public query func getSiteContent() : async Types.SiteContent {
    ContentLib.getSiteContent(greeting, messages, song.value, songUrl);
  };

  /// Public read of the active background song source.
  public query func getSongSource() : async Types.SongSource {
    ContentLib.getSongSource(song.value, songUrl);
  };

  /// Owner-only: set the external audio URL for the background song.
  public shared ({ caller }) func setSongUrl(url : Text) : async Types.SongSource {
    requireOwner(caller);
    if (not ContentLib.isValidAudioUrl(url)) {
      Runtime.trap("Invalid audio URL: must start with http:// or https://");
    };
    ContentLib.setSongUrl(song.value, songUrl, url);
  };

  /// Owner-only: clear the external audio URL, reverting to the uploaded song.
  public shared ({ caller }) func clearSongUrl() : async Types.SongSource {
    requireOwner(caller);
    ContentLib.clearSongUrl(song.value, songUrl);
  };

  /// Owner-only: update the greeting headline and subtext.
  public shared ({ caller }) func updateGreeting(input : Types.GreetingInput) : async Types.Greeting {
    requireOwner(caller);
    ContentLib.updateGreeting(greeting, input);
  };

  /// Owner-only: set or replace the hero photo.
  public shared ({ caller }) func setHeroPhoto(photo : Types.StoredFile) : async Types.Greeting {
    requireOwner(caller);
    ContentLib.setHeroPhoto(greeting, photo);
  };

  /// Owner-only: save crop/adjust parameters for the hero photo.
  public shared ({ caller }) func setHeroCrop(crop : Types.CropAdjust) : async Bool {
    requireOwner(caller);
    ContentLib.setHeroCrop(greeting, crop);
  };

  /// Owner-only: add a message entry.
  public shared ({ caller }) func addMessage(input : Types.MessageInput) : async Types.MessageId {
    requireOwner(caller);
    ContentLib.addMessage(messages, nextMessageId, input);
  };

  /// Owner-only: update a message entry.
  public shared ({ caller }) func updateMessage(id : Types.MessageId, input : Types.MessageInput) : async Bool {
    requireOwner(caller);
    ContentLib.updateMessage(messages, id, input);
  };

  /// Owner-only: save crop/adjust parameters for a message's photo.
  public shared ({ caller }) func setMessageCrop(id : Types.MessageId, crop : Types.CropAdjust) : async Bool {
    requireOwner(caller);
    ContentLib.setMessageCrop(messages, id, crop);
  };

  /// Owner-only: delete a message entry.
  public shared ({ caller }) func deleteMessage(id : Types.MessageId) : async Bool {
    requireOwner(caller);
    ContentLib.deleteMessage(messages, id);
  };

  /// Owner-only: set or replace the background song.
  public shared ({ caller }) func setSong(file : Types.StoredFile) : async Types.StoredFile {
    requireOwner(caller);
    ContentLib.setSong(song, file);
  };

  func requireOwner(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: owner only");
    };
  };
};
