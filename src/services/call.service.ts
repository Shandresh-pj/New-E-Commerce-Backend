import dataSource from "../config/database";
import { CallSession, CallType, CallStatus } from "../entities/call_session.entity";
import { CallParticipant, CallParticipantStatus } from "../entities/call_participant.entity";
import { User } from "../entities/user";
import { In } from "typeorm";

export class CallService {
  private sessionRepo = dataSource.getRepository(CallSession);
  private participantRepo = dataSource.getRepository(CallParticipant);
  private userRepo = dataSource.getRepository(User);

  /**
   * Initiate a WebRTC call / team meeting session
   */
  async initiateCall(data: {
    caller_id: number;
    call_type: CallType;
    conversation_id?: number;
    invited_user_ids?: number[];
  }) {
    const meetingCode = `MEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const session = this.sessionRepo.create({
      meeting_code: meetingCode,
      caller_id: data.caller_id,
      call_type: data.call_type,
      conversation_id: data.conversation_id || null,
      status: CallStatus.INITIATED,
    });

    const savedSession = await this.sessionRepo.save(session);

    // Add caller as CONNECTED participant
    const callerPart = this.participantRepo.create({
      session_id: savedSession.id,
      user_id: data.caller_id,
      status: CallParticipantStatus.CONNECTED,
    });
    await this.participantRepo.save(callerPart);

    // Add invited users
    if (data.invited_user_ids && data.invited_user_ids.length > 0) {
      const invited = data.invited_user_ids
        .filter((id) => id !== data.caller_id)
        .map((uId) =>
          this.participantRepo.create({
            session_id: savedSession.id,
            user_id: uId,
            status: CallParticipantStatus.INVITED,
          })
        );
      await this.participantRepo.save(invited);
    }

    return this.getCallSessionById(savedSession.id);
  }

  /**
   * Join existing call by meeting code
   */
  async joinCall(meetingCode: string, userId: number) {
    const session = await this.sessionRepo.findOne({ where: { meeting_code: meetingCode } });
    if (!session) throw new Error("Meeting not found");

    if (session.status === CallStatus.ENDED) {
      throw new Error("This meeting has already ended");
    }

    let participant = await this.participantRepo.findOne({
      where: { session_id: session.id, user_id: userId },
    });

    if (!participant) {
      participant = this.participantRepo.create({
        session_id: session.id,
        user_id: userId,
        status: CallParticipantStatus.CONNECTED,
      });
    } else {
      participant.status = CallParticipantStatus.CONNECTED;
      participant.joined_at = new Date();
      participant.left_at = null;
    }

    await this.participantRepo.save(participant);

    if (session.status === CallStatus.INITIATED) {
      session.status = CallStatus.ACTIVE;
      await this.sessionRepo.save(session);
    }

    return this.getCallSessionById(session.id);
  }

  /**
   * Update participant media state (mute, camera off, screen share)
   */
  async updateParticipantStatus(sessionId: number, userId: number, status: CallParticipantStatus) {
    const participant = await this.participantRepo.findOne({
      where: { session_id: sessionId, user_id: userId },
    });
    if (participant) {
      participant.status = status;
      if (status === CallParticipantStatus.LEFT) {
        participant.left_at = new Date();
      }
      await this.participantRepo.save(participant);
    }
    return { success: true };
  }

  /**
   * End a call session
   */
  async endCall(sessionId: number, callerId: number) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (session) {
      session.status = CallStatus.ENDED;
      session.ended_at = new Date();
      await this.sessionRepo.save(session);

      await this.participantRepo.update(
        { session_id: sessionId, left_at: undefined },
        { status: CallParticipantStatus.LEFT, left_at: new Date() }
      );
    }
    return { success: true };
  }

  /**
   * Get session details with participant list
   */
  async getCallSessionById(id: number) {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) return null;

    const participants = await this.participantRepo.find({
      where: { session_id: id },
      relations: { user: true },
    });

    return {
      ...session,
      participants: participants.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        status: p.status,
        name: p.user ? p.user.name : `User #${p.user_id}`,
        joined_at: p.joined_at,
      })),
    };
  }

  /**
   * Get user call/meeting history
   */
  async getCallHistory(userId: number) {
    const userParts = await this.participantRepo.find({
      where: { user_id: userId },
    });
    const sessionIds = userParts.map((p) => p.session_id);
    if (sessionIds.length === 0) return [];

    const sessions = await this.sessionRepo.find({
      where: { id: In(sessionIds) },
      order: { created_at: "DESC" },
      relations: { caller: true },
      take: 50,
    });

    return sessions.map((s) => ({
      ...s,
      caller_name: s.caller ? s.caller.name : `User #${s.caller_id}`,
    }));
  }
}
