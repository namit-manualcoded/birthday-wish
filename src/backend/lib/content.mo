import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Types "../types/content";

module {
  /// Returns the current site content (greeting, messages ordered by position, song).
  public func getSiteContent(
    greeting : { var value : Types.Greeting },
    messages : Map.Map<Types.MessageId, Types.Message>,
    song : ?Types.StoredFile,
    songUrl : { var value : ?Text },
  ) : Types.SiteContent {
    let ordered = messages.values().toArray().sort(
      func(a, b) = Nat.compare(a.position, b.position)
    );
    {
      greeting = greeting.value;
      messages = ordered;
      song;
      songSource = getSongSource(song, songUrl);
    };
  };

  /// Resolves the active song source from the URL and uploaded-file cells.
  /// A set URL takes precedence over an uploaded file; with neither, the
  /// frontend falls back to its bundled default theme song.
  public func getSongSource(
    song : ?Types.StoredFile,
    songUrl : { var value : ?Text },
  ) : Types.SongSource {
    switch (songUrl.value) {
      case (?url) { { kind = #url; url = ?url; file = song } };
      case null {
        switch (song) {
          case (?file) { { kind = #upload; url = null; file = ?file } };
          case null { { kind = #default; url = null; file = null } };
        };
      };
    };
  };

  /// Validates a plausible http(s) audio URL.
  public func isValidAudioUrl(url : Text) : Bool {
    let trimmed = url.trim(#char ' ');
    (trimmed.startsWith(#text "http://") or trimmed.startsWith(#text "https://"))
      and trimmed.size() > 8;
  };

  /// Sets the external audio URL, taking precedence over the uploaded file.
  public func setSongUrl(
    song : ?Types.StoredFile,
    songUrl : { var value : ?Text },
    url : Text,
  ) : Types.SongSource {
    songUrl.value := ?url;
    getSongSource(song, songUrl);
  };

  /// Clears the external audio URL, falling back to the uploaded file.
  public func clearSongUrl(
    song : ?Types.StoredFile,
    songUrl : { var value : ?Text },
  ) : Types.SongSource {
    songUrl.value := null;
    getSongSource(song, songUrl);
  };

  /// Updates the greeting headline and subtext, preserving the hero photo and
  /// its saved crop adjustments.
  public func updateGreeting(
    greeting : { var value : Types.Greeting },
    input : Types.GreetingInput,
  ) : Types.Greeting {
    let updated : Types.Greeting = {
      headline = input.headline;
      subtext = input.subtext;
      heroPhoto = greeting.value.heroPhoto;
      heroCrop = greeting.value.heroCrop;
    };
    greeting.value := updated;
    updated;
  };

  /// Sets or replaces the hero photo, clearing any crop saved for the previous
  /// photo so stale adjustments never apply to a new image.
  public func setHeroPhoto(
    greeting : { var value : Types.Greeting },
    photo : Types.StoredFile,
  ) : Types.Greeting {
    let updated : Types.Greeting = {
      headline = greeting.value.headline;
      subtext = greeting.value.subtext;
      heroPhoto = ?photo;
      heroCrop = null;
    };
    greeting.value := updated;
    updated;
  };

  /// Saves crop/adjust parameters for the hero photo. Returns false when no
  /// hero photo is set, since there is nothing to crop.
  public func setHeroCrop(
    greeting : { var value : Types.Greeting },
    crop : Types.CropAdjust,
  ) : Bool {
    switch (greeting.value.heroPhoto) {
      case null { false };
      case (?photo) {
        greeting.value := {
          headline = greeting.value.headline;
          subtext = greeting.value.subtext;
          heroPhoto = ?photo;
          heroCrop = ?crop;
        };
        true;
      };
    };
  };

  /// Adds a new message entry and returns its assigned id.
  public func addMessage(
    messages : Map.Map<Types.MessageId, Types.Message>,
    nextId : { var value : Nat },
    input : Types.MessageInput,
  ) : Types.MessageId {
    let id = nextId.value;
    nextId.value := id + 1;
    messages.add(id, {
      id;
      text = input.text;
      photo = input.photo;
      crop = input.crop;
      position = input.position;
    });
    id;
  };

  /// Updates an existing message entry. Returns false when the id is unknown.
  public func updateMessage(
    messages : Map.Map<Types.MessageId, Types.Message>,
    id : Types.MessageId,
    input : Types.MessageInput,
  ) : Bool {
    switch (messages.get(id)) {
      case null { false };
      case (?_) {
        messages.add(id, {
          id;
          text = input.text;
          photo = input.photo;
          crop = input.crop;
          position = input.position;
        });
        true;
      };
    };
  };

  /// Saves crop/adjust parameters for a message's photo. Returns false when the
  /// message is unknown or has no photo.
  public func setMessageCrop(
    messages : Map.Map<Types.MessageId, Types.Message>,
    id : Types.MessageId,
    crop : Types.CropAdjust,
  ) : Bool {
    switch (messages.get(id)) {
      case null { false };
      case (?message) {
        switch (message.photo) {
          case null { false };
          case (?photo) {
            messages.add(id, {
              id = message.id;
              text = message.text;
              photo = ?photo;
              crop = ?crop;
              position = message.position;
            });
            true;
          };
        };
      };
    };
  };

  /// Deletes a message entry. Returns false when the id is unknown.
  public func deleteMessage(
    messages : Map.Map<Types.MessageId, Types.Message>,
    id : Types.MessageId,
  ) : Bool {
    switch (messages.get(id)) {
      case null { false };
      case (?_) {
        messages.remove(id);
        true;
      };
    };
  };

  /// Sets or replaces the background song.
  public func setSong(
    song : { var value : ?Types.StoredFile },
    file : Types.StoredFile,
  ) : Types.StoredFile {
    song.value := ?file;
    file;
  };
};
